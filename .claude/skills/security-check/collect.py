#!/usr/bin/env python3
"""보안 점검 스킬 수집기. Python 표준 라이브러리만 쓰고, 어떤 파일도 고치지 않는다.

하위 명령
  reports   최근 IT 보안 리포트(이 저장소 origin 기본 브랜치)를 출력
  inventory 점검 루트 아래 프로젝트의 설치 버전·런타임 단서를 모으고 --check 규칙으로 판정
  usage     프로젝트 소스·설정에서 정규식 패턴을 찾는다(취약 기능을 실제로 쓰는지, 노출 조건 확인용)
  audit     npm/pnpm audit 실행 결과(high·critical) 요약. 사용자가 동의한 경우에만 실행한다
  outpath   결과 파일 경로를 정하고, 이 저장소 안이면 거부
  config    점검 대상 설정(자동: 한 폴더 아래 전부 / 지정: 폴더 목록) 보기·저장
"""
from __future__ import annotations

import argparse
import datetime
import json
import os
import re
import shutil
import subprocess
import sys
from pathlib import Path

SKILL_DIR = Path(__file__).resolve().parent
REPORT_DIR = "reports/security-daily-report"
LOCKFILES = {
    "package-lock.json": "npm",
    "npm-shrinkwrap.json": "npm",
    "pnpm-lock.yaml": "pnpm",
    "yarn.lock": "yarn",
}
SKIP_DIRS = {
    "node_modules", "dist", "build", "out", "coverage", "vendor", "tmp",
    ".git", ".next", ".turbo", ".cache", ".vercel", ".output", ".nuxt", ".svelte-kit",
}
KST = datetime.timezone(datetime.timedelta(hours=9))
INF = 10**9
# usage 검색 대상: 소스·설정 파일만. lockfile은 패키지 이름이 잔뜩 들어 있어 "사용처"가 아니므로 뺀다.
USAGE_EXTS = {".ts", ".tsx", ".mts", ".cts", ".js", ".jsx", ".mjs", ".cjs", ".json", ".yml", ".yaml", ".toml"}
USAGE_SKIP_FILES = set(LOCKFILES) | {"bun.lockb"}
USAGE_MAX_BYTES = 1_000_000


# ── 공통 ────────────────────────────────────────────────────────────────

def run(cmd: list[str], cwd: Path | None = None, timeout: int = 30) -> tuple[int, str, str]:
    try:
        p = subprocess.run(cmd, cwd=cwd, capture_output=True, text=True, timeout=timeout)
        return p.returncode, p.stdout, p.stderr
    except subprocess.TimeoutExpired:
        return -1, "", f"{timeout}초 안에 끝나지 않음"
    except OSError as e:
        return -1, "", str(e)


def repo_root() -> Path:
    code, out, _ = run(["git", "-C", str(SKILL_DIR), "rev-parse", "--show-toplevel"])
    if code == 0 and out.strip():
        return Path(out.strip()).resolve()
    return SKILL_DIR.parents[2].resolve()  # .claude/skills/security-check → 저장소


CONFIG_PATH = SKILL_DIR / "config.local.json"  # 개인 경로가 들어가므로 git에 올리지 않는다(.gitignore)
DEFAULT_DEPTH = 3  # 프로젝트 폴더 기준으로 몇 단계 아래까지 package.json을 찾을지


def load_config() -> dict:
    try:
        data = json.loads(CONFIG_PATH.read_text(encoding="utf-8"))
        return data if isinstance(data, dict) else {}
    except (OSError, ValueError):
        return {}


def resolve_scope(root_arg: str | None = None, paths_arg: list[str] | None = None) -> dict:
    """점검 대상을 정한다. 우선순위: 명령 옵션 > 환경 변수 > 설정 파일 > 기본값.

    - 자동(auto): root 바로 아래 폴더들을 프로젝트 폴더로 보고 그 안을 찾는다. exclude에 든 이름은 건너뛴다.
      root 자체가 프로젝트(package.json 있음)면 root 하나만 본다.
    - 지정(list): paths에 적힌 폴더 각각을 프로젝트 폴더로 본다(흩어져 있어도 된다).
    """
    cfg = load_config()
    from_config = False
    if paths_arg:
        mode, source, root, paths, exclude = "list", "명령 옵션(--path)", None, paths_arg, []
    elif root_arg:
        mode, source, root, paths, exclude = "auto", "명령 옵션(--root)", root_arg, [], []
    elif os.environ.get("SECURITY_CHECK_ROOT"):
        mode, source, root, paths, exclude = "auto", "환경 변수(SECURITY_CHECK_ROOT)", os.environ["SECURITY_CHECK_ROOT"], [], []
    elif cfg.get("mode") in ("auto", "list"):
        from_config = True
        mode, source = cfg["mode"], "설정 파일"
        root, paths, exclude = cfg.get("root"), cfg.get("paths") or [], cfg.get("exclude") or []
    else:
        mode, source, root, paths, exclude = "auto", "기본값(설정 없음)", str(repo_root().parent), [], []

    depth = int(cfg.get("max_depth", DEFAULT_DEPTH)) if from_config else DEFAULT_DEPTH
    tops: list[Path] = []
    missing: list[str] = []
    base = None
    if mode == "auto":
        base = Path(root or ".").expanduser().resolve()
        if not base.is_dir():
            missing.append(str(base))
        elif (base / "package.json").is_file():
            tops = [base]
        else:
            tops = [
                c for c in sorted(base.iterdir())
                if c.is_dir() and c.name not in SKIP_DIRS and not c.name.startswith(".") and c.name not in exclude
            ]
    else:
        for item in paths:
            q = Path(item).expanduser().resolve()
            if q.is_dir():
                tops.append(q)
            else:
                missing.append(str(q))

    if from_config and cfg.get("out_dir"):
        out_dir = Path(cfg["out_dir"]).expanduser().resolve()
    elif mode == "auto" and base is not None and base.is_dir() and base not in tops:
        out_dir = base / "security-check"
    else:
        out_dir = repo_root().parent / "security-check"
    return {
        "mode": mode, "source": source, "configured": cfg.get("mode") in ("auto", "list"),
        "root": str(base) if base else None, "tops": tops, "missing": missing,
        "exclude": exclude, "max_depth": depth, "out_dir": out_dir,
    }


def describe_scope(scope: dict) -> str:
    if scope["mode"] == "auto":
        text = f"자동 — {scope['root']} 아래"
        if scope["exclude"]:
            text += f" (제외: {', '.join(scope['exclude'])})"
    else:
        text = f"지정 — 프로젝트 폴더 {len(scope['tops'])}곳"
    return f"{text} · 출처: {scope['source']}"


def today_kst() -> str:
    return datetime.datetime.now(KST).strftime("%Y-%m-%d")


# ── 버전 규칙 ────────────────────────────────────────────────────────────
# 규칙 예: ">=16.0.0 <16.4.1 || >=13.0.0 <15.5.28", "<6.29.1", "=1.2.3"

VERSION_RE = re.compile(r"^v?(\d+)(?:\.(\d+))?(?:\.(\d+))?")


def parse_version(text: str) -> tuple[int | None, int | None, int | None] | None:
    m = VERSION_RE.match(text.strip())
    if not m:
        return None
    return tuple(int(x) if x is not None else None for x in m.groups())  # type: ignore[return-value]


def _bounds(alt: str):
    """한 구간(공백으로 이은 비교식들)을 [low, high] 경계로 바꾼다."""
    low, low_inc, high, high_inc = (0, 0, 0), True, (INF, INF, INF), True
    comps = re.findall(r"(>=|<=|>|<|=)?\s*v?(\d+(?:\.\d+){0,2})", alt)
    if not comps:
        return None
    for op, ver in comps:
        t = tuple(int(x) for x in (ver.split(".") + ["0", "0"])[:3])
        op = op or "="
        if op in (">=", ">", "=") and (t > low or (t == low and op == ">")):
            low, low_inc = t, op != ">"
        if op in ("<=", "<", "=") and (t < high or (t == high and op == "<")):
            high, high_inc = t, op != "<"
    return low, low_inc, high, high_inc


def _inside(v, b) -> bool:
    low, low_inc, high, high_inc = b
    above = v > low or (v == low and low_inc)
    below = v < high or (v == high and high_inc)
    return above and below


def check_version(version: str, rule: str) -> str:
    """'vulnerable' | 'safe' | 'unclear' | 'unparsed'.

    "24"처럼 일부만 적힌 버전(Docker 태그, .nvmrc)은 24.0.0~24.∞ 구간으로 보고,
    그 구간이 통째로 취약 범위 안이면 vulnerable, 전혀 겹치지 않으면 safe, 일부만 겹치면 unclear.
    """
    v = parse_version(version)
    if v is None:
        return "unparsed"
    lo = tuple(x if x is not None else 0 for x in v)
    hi = tuple(x if x is not None else INF for x in v)
    overlaps = False
    for alt in rule.split("||"):
        b = _bounds(alt)
        if b is None:
            continue
        if _inside(lo, b) and _inside(hi, b):
            return "vulnerable"
        low, low_inc, high, high_inc = b
        if not (hi < low or lo > high or (hi == low and not low_inc) or (lo == high and not high_inc)):
            overlaps = True
    return "unclear" if overlaps else "safe"


def version_key(text: str) -> tuple[int, int, int]:
    v = parse_version(text) or (0, 0, 0)
    return tuple(x or 0 for x in v)  # type: ignore[return-value]


def parse_rules(items: list[str]) -> dict[str, str]:
    rules: dict[str, str] = {}
    for item in items:
        name, sep, rule = item.partition(":")
        if not sep or not name.strip() or not rule.strip():
            raise SystemExit(f"규칙 형식이 틀림: {item!r} (예: 'next:>=16.0.0 <16.4.1 || <15.5.28')")
        key = name.strip()
        rules[key] = f"{rules[key]} || {rule.strip()}" if key in rules else rule.strip()
    return rules


# ── lockfile 읽기 ───────────────────────────────────────────────────────

def parse_npm_lock(text: str) -> dict[str, set[str]]:
    data = json.loads(text)
    found: dict[str, set[str]] = {}
    packages = data.get("packages")
    if isinstance(packages, dict) and packages:
        for key, meta in packages.items():
            if "node_modules/" not in key or not isinstance(meta, dict):
                continue
            version = meta.get("version")
            if version:
                found.setdefault(key.rsplit("node_modules/", 1)[1], set()).add(version)
        return found

    def walk(deps):  # lockfileVersion 1
        for name, meta in (deps or {}).items():
            if isinstance(meta, dict):
                version = meta.get("version")
                if version and parse_version(version):
                    found.setdefault(name, set()).add(version)
                walk(meta.get("dependencies"))

    walk(data.get("dependencies"))
    return found


PNPM_KEY = re.compile(r"""^  ['"]?/?((?:@[^/@\s'"]+/)?[^/@\s'"(]+)[@/](\d[^\s:'"()_]*)""")


def parse_pnpm_lock(text: str) -> dict[str, set[str]]:
    """packages·snapshots 절의 키만 읽는다. v5(/name/1.0.0), v6(/name@1.0.0), v9(name@1.0.0) 모두."""
    found: dict[str, set[str]] = {}
    section = None
    for line in text.splitlines():
        if line and not line[0].isspace():
            section = line.split(":", 1)[0].strip()
            continue
        if section not in ("packages", "snapshots"):
            continue
        m = PNPM_KEY.match(line)
        if m:
            found.setdefault(m.group(1), set()).add(m.group(2))
    return found


def parse_yarn_lock(text: str) -> dict[str, set[str]]:
    """yarn v1과 berry(2+) 둘 다."""
    found: dict[str, set[str]] = {}
    names: list[str] = []
    for line in text.splitlines():
        if line and not line[0].isspace() and not line.startswith("#"):
            names = []
            for spec in line.rstrip().rstrip(":").split(","):
                m = re.match(r"^((?:@[^/@]+/)?[^@]+)@", spec.strip().strip('"'))
                if m:
                    names.append(m.group(1))
            continue
        m = re.match(r'^\s+version:?\s+"?([^"\s]+)"?', line)
        if m and names:
            for name in set(names):
                found.setdefault(name, set()).add(m.group(1))
            names = []
    return found


PARSERS = {"npm": parse_npm_lock, "pnpm": parse_pnpm_lock, "yarn": parse_yarn_lock}


# ── 프로젝트·런타임 찾기 ─────────────────────────────────────────────────

def find_projects(top: Path, max_depth: int) -> list[Path]:
    """프로젝트 폴더(top)와 그 아래 max_depth 단계까지에서 package.json이 있는 폴더."""
    projects = []
    for dirpath, dirnames, filenames in os.walk(top):
        here = Path(dirpath)
        depth = len(here.relative_to(top).parts)
        dirnames[:] = sorted(d for d in dirnames if d not in SKIP_DIRS and not d.startswith("."))
        if depth >= max_depth:
            dirnames[:] = []
        if "package.json" in filenames:
            projects.append(here)
    return projects


def nearest_lock(project: Path, top: Path) -> tuple[Path, str] | None:
    d = project
    while True:
        for name, kind in LOCKFILES.items():
            if (d / name).is_file():
                return d / name, kind
        if d == top or top not in d.parents:
            return None
        d = d.parent


def read_json(path: Path) -> dict:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return {}


def split_image(image: str) -> tuple[str, str]:
    """'public.ecr.aws/docker/library/node:24-alpine' → ('node', '24-alpine'). 태그가 없으면 latest."""
    last = image.split("@", 1)[0].split("/")[-1]
    name, _, tag = last.partition(":")
    return name, tag or "latest"


def runtime_hints(top: Path, max_depth: int) -> list[dict]:
    """Node 버전과 컨테이너 이미지 단서. 같은 것을 여러 곳에서 찾으면 모두 남긴다."""
    hints: list[dict] = []
    seen: set[tuple] = set()

    def add(kind, name, version, where):
        key = (kind, name, version, str(where.relative_to(top)))
        if key not in seen:  # 멀티 스테이지 Dockerfile처럼 같은 단서가 여러 번 나오면 한 번만
            seen.add(key)
            hints.append({"kind": kind, "name": name, "version": version, "where": key[3]})

    for fname in (".nvmrc", ".node-version"):
        p = top / fname
        if p.is_file():
            first = p.read_text(encoding="utf-8", errors="ignore").strip().splitlines()[:1]
            if first:
                add("runtime", "node", first[0].strip(), p)
    tv = top / ".tool-versions"
    if tv.is_file():
        for line in tv.read_text(encoding="utf-8", errors="ignore").splitlines():
            parts = line.split()
            if len(parts) >= 2 and parts[0] in ("nodejs", "node"):
                add("runtime", "node", parts[1], tv)

    for dirpath, dirnames, filenames in os.walk(top):
        here = Path(dirpath)
        depth = len(here.relative_to(top).parts)
        dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS and (not d.startswith(".") or d in (".github",))]
        if depth >= max_depth:
            dirnames[:] = []
        for f in filenames:
            p = here / f
            lower = f.lower()
            try:
                if lower.startswith("dockerfile") or lower.endswith(".dockerfile"):
                    for line in p.read_text(encoding="utf-8", errors="ignore").splitlines():
                        m = re.match(r"^\s*FROM\s+(?:--platform=\S+\s+)?(\S+)", line, re.I)
                        if m and "$" not in m.group(1):
                            add("image", *split_image(m.group(1)), p)
                elif re.match(r"^(docker-)?compose.*\.ya?ml$", lower):
                    for line in p.read_text(encoding="utf-8", errors="ignore").splitlines():
                        m = re.match(r"^\s*image:\s*['\"]?([^'\"\s#]+)", line)
                        if m and "$" not in m.group(1):
                            add("image", *split_image(m.group(1)), p)
                elif lower in (".gitlab-ci.yml", ".gitlab-ci.yaml") or (
                    here.name == "workflows" and here.parent.name == ".github" and lower.endswith((".yml", ".yaml"))
                ):
                    text = p.read_text(encoding="utf-8", errors="ignore")
                    for v in re.findall(r"node-version:\s*['\"]?([\w.x-]+)", text):
                        add("runtime", "node", v, p)
                    for img in re.findall(r"^\s*image:\s*['\"]?([^'\"\s#]+)", text, re.M):
                        add("image", *split_image(img), p)
            except OSError:
                continue
    for h in hints:
        if h["kind"] == "image" and h["name"] == "node":
            h["kind"] = "runtime"  # node 이미지 태그 = Node 버전 단서
    return hints


def scan_project(proj: Path, top: Path, rules: dict[str, str], lock_cache: dict) -> dict:
    """프로젝트 하나의 lockfile과 규칙 대상 패키지 설치 버전."""
    base = top.parent
    pkg = read_json(proj / "package.json")
    declared = {**pkg.get("devDependencies", {}), **pkg.get("dependencies", {})}
    lock = nearest_lock(proj, top)
    entry = {
        "path": str(proj.relative_to(base)),
        "name": pkg.get("name"),
        "lockfile": str(lock[0].relative_to(base)) if lock else None,
        "manager": lock[1] if lock else None,
        "engines_node": (pkg.get("engines") or {}).get("node"),
        "packages": {},
    }
    installed: dict[str, set[str]] = {}
    if lock:
        if lock[0] not in lock_cache:
            try:
                lock_cache[lock[0]] = PARSERS[lock[1]](lock[0].read_text(encoding="utf-8", errors="ignore"))
            except (ValueError, OSError) as e:
                lock_cache[lock[0]] = {}
                entry["lock_error"] = str(e)[:120]
        installed = lock_cache[lock[0]]
    for name, rule in rules.items():
        if name == "node" or (name not in installed and name not in declared):
            continue
        versions = sorted(installed.get(name, set()), key=version_key)
        entry["packages"][name] = {
            "declared": declared.get(name),
            "installed": {v: (check_version(v, rule) if rule else None) for v in versions},
        }
    return entry


def inventory(scope: dict, rules: dict[str, str]) -> dict:
    lock_cache: dict[Path, dict[str, set[str]]] = {}
    repos: dict[str, dict] = {}
    for top in scope["tops"]:
        projects = find_projects(top, scope["max_depth"])
        if not projects:
            continue
        label = top.name if top.name not in repos else str(top)
        hints = runtime_hints(top, scope["max_depth"])
        for h in hints:
            rule = rules.get(h["name"])
            h["result"] = check_version(h["version"], rule) if rule else None
        repos[label] = {
            "path": str(top),
            "projects": [scan_project(proj, top, rules, lock_cache) for proj in projects],
            "hints": hints,
        }

    local = []
    code, out, _ = run(["node", "-v"])
    if code == 0 and out.strip():
        rule = rules.get("node")
        local.append({"name": "node", "version": out.strip(), "result": check_version(out.strip(), rule) if rule else None})
    scope_out = {k: scope[k] for k in ("mode", "source", "root", "missing", "exclude", "max_depth")}
    scope_out["description"] = describe_scope(scope)
    return {"scope": scope_out, "rules": rules, "local": local, "repos": repos}


LABEL = {"vulnerable": "취약", "safe": "안전", "unclear": "불명확(범위 일부만 겹침)", "unparsed": "버전 해석 불가"}


def print_inventory(data: dict) -> None:
    repos = data["repos"]
    n_proj = sum(len(r["projects"]) for r in repos.values())
    print(f"점검 대상: {data['scope']['description']}  (프로젝트 폴더 {len(repos)}곳, package.json {n_proj}개)")
    for m in data["scope"]["missing"]:
        print(f"  ⚠ 찾을 수 없는 경로: {m}")
    if data["rules"]:
        print("규칙:")
        for k, v in data["rules"].items():
            print(f"  - {k}: {v}")
    counts = {"vulnerable": 0, "unclear": 0, "unknown_install": 0}
    for item in data.get("local", []):
        res = f" → {LABEL[item['result']]}" if item.get("result") else ""
        if item.get("result") in ("vulnerable", "unclear"):
            counts[item["result"]] += 1
        print(f"이 컴퓨터: Node {item['version']}{res}")
    for name, repo in sorted(repos.items()):
        print(f"\n## {name}")
        for p in repo["projects"]:
            lock = f"{p['manager']}, {p['lockfile']}" if p["lockfile"] else "lockfile 없음"
            print(f"- {p['path']} ({lock})" + (f"  engines.node={p['engines_node']}" if p["engines_node"] else ""))
            if p.get("lock_error"):
                print(f"  - lockfile 읽기 실패: {p['lock_error']}")
            for pkg, info in p["packages"].items():
                if info["installed"]:
                    parts = ", ".join(f"{v} → {LABEL[r]}" if r else v for v, r in info["installed"].items())
                    counts["vulnerable"] += sum(r == "vulnerable" for r in info["installed"].values())
                    counts["unclear"] += sum(r == "unclear" for r in info["installed"].values())
                    print(f"  - {pkg}: {parts}" + (f"  (package.json {info['declared']})" if info["declared"] else ""))
                else:
                    counts["unknown_install"] += 1
                    print(f"  - {pkg}: 설치 버전 불명 (package.json {info['declared']})")
        if repo["hints"]:
            print("- 런타임·이미지 단서:")
            for h in repo["hints"]:
                res = f" → {LABEL[h['result']]}" if h.get("result") else ""
                if h.get("result") in ("vulnerable", "unclear"):
                    counts[h["result"]] += 1
                kind = "Node" if h["kind"] == "runtime" else f"이미지 {h['name']}"
                print(f"  - {kind} {h['version']} ({h['where']}){res}")
    print(f"\n요약: 취약 {counts['vulnerable']}, 불명확 {counts['unclear']}, 설치 버전 불명 {counts['unknown_install']}")


# ── 사용처 검색 ──────────────────────────────────────────────────────────

def parse_patterns(items: list[str]) -> dict[str, re.Pattern]:
    """'이름=정규식' 목록 → {이름: 컴파일된 정규식}. '='가 없으면 정규식 자체를 이름으로 쓴다."""
    patterns: dict[str, re.Pattern] = {}
    for item in items:
        name, sep, regex = item.partition("=")
        if not sep:
            name, regex = item, item
        name, regex = name.strip(), regex.strip()
        if not name or not regex:
            raise SystemExit(f"패턴 형식이 틀림: {item!r} (예: \"use server=^\\s*['\\\"]use server['\\\"]\")")
        try:
            patterns[name] = re.compile(regex)
        except re.error as e:
            raise SystemExit(f"정규식 오류 ({name}): {e}")
    return patterns


def iter_source_files(top: Path):
    """프로젝트 폴더 아래 소스·설정 파일. 의존성·빌드 산출물·숨김 폴더(.github 제외)는 건너뛴다. 깊이 제한 없음."""
    for dirpath, dirnames, filenames in os.walk(top):
        dirnames[:] = sorted(d for d in dirnames if d not in SKIP_DIRS and (not d.startswith(".") or d == ".github"))
        here = Path(dirpath)
        for f in sorted(filenames):
            lower = f.lower()
            if f in USAGE_SKIP_FILES or lower.startswith(".env"):
                continue
            is_docker = lower.startswith("dockerfile") or lower.endswith(".dockerfile")
            if not is_docker and Path(lower).suffix not in USAGE_EXTS:
                continue
            p = here / f
            try:
                if p.stat().st_size > USAGE_MAX_BYTES:
                    continue
            except OSError:
                continue
            yield p


def search_usage(top: Path, patterns: dict[str, re.Pattern], max_files: int) -> dict[str, dict]:
    """패턴마다 일치한 파일 수와, 앞 max_files개 파일의 첫 일치 줄."""
    result = {name: {"files": 0, "examples": []} for name in patterns}
    for p in iter_source_files(top):
        try:
            lines = p.read_text(encoding="utf-8", errors="ignore").splitlines()
        except OSError:
            continue
        for name, rx in patterns.items():
            for no, line in enumerate(lines, 1):
                if rx.search(line):
                    r = result[name]
                    r["files"] += 1
                    if len(r["examples"]) < max_files:
                        r["examples"].append({"path": str(p.relative_to(top)), "line": no, "text": line.strip()[:120]})
                    break
    return result


def usage(scope: dict, patterns: dict[str, re.Pattern], max_files: int) -> dict:
    repos: dict[str, dict] = {}
    for top in scope["tops"]:
        if not find_projects(top, scope["max_depth"]):  # inventory와 같은 기준: Node 프로젝트가 있는 폴더만
            continue
        label = top.name if top.name not in repos else str(top)
        repos[label] = {"path": str(top), "matches": search_usage(top, patterns, max_files)}
    scope_out = {k: scope[k] for k in ("mode", "source", "root", "missing", "exclude")}
    scope_out["description"] = describe_scope(scope)
    return {"scope": scope_out, "patterns": {k: v.pattern for k, v in patterns.items()}, "repos": repos}


def print_usage(data: dict) -> None:
    print(f"점검 대상: {data['scope']['description']}  (Node 프로젝트가 있는 폴더 {len(data['repos'])}곳)")
    for m in data["scope"]["missing"]:
        print(f"  ⚠ 찾을 수 없는 경로: {m}")
    print("패턴:")
    for name, regex in data["patterns"].items():
        print(f"  - {name}: {regex}")
    for label, repo in data["repos"].items():
        print(f"\n## {label}")
        for name, r in repo["matches"].items():
            if not r["files"]:
                print(f"  - {name}: 없음")
                continue
            print(f"  - {name}: 파일 {r['files']}개")
            for ex in r["examples"]:
                print(f"      {ex['path']}:{ex['line']}: {ex['text']}")
    print("\n참고: 소스·설정 파일(.ts/.js/.json/.yml/Dockerfile 등)만 찾았다. lockfile·node_modules·빌드 산출물·.env는 제외.")


# ── 하위 명령 ────────────────────────────────────────────────────────────

DATE_IN_PATH = re.compile(r"(\d{4})/(\d{2})/(\d{2})\.md$|(\d{4})-(\d{2})-(\d{2})\.md$")


def report_date(path: str) -> str | None:
    m = DATE_IN_PATH.search(path)
    return "-".join(x for x in m.groups() if x) if m else None


def pick_reports(paths: list[str], count: int) -> list[tuple[str, str]]:
    """최신순 count건. 같은 날짜가 두 구조에 다 있으면 새 구조(YYYY/MM/DD.md)를 쓴다."""
    dated = [(d, p) for p in paths if (d := report_date(p))]
    picked, seen = [], set()
    # 날짜 내림차순, 같은 날짜면 새 구조(경로 안에 '/'가 더 있음)를 먼저
    for d, p in sorted(dated, key=lambda x: (x[0], x[1].count("/")), reverse=True):
        if d not in seen:
            seen.add(d)
            picked.append((d, p))
        if len(picked) >= count:
            break
    return picked


def cmd_reports(args) -> int:
    repo = repo_root()
    notes, ref = [], None
    code, _, err = run(["git", "-C", str(repo), "fetch", "--quiet", "origin"], timeout=60)
    if code == 0:
        c, out, _ = run(["git", "-C", str(repo), "symbolic-ref", "--short", "refs/remotes/origin/HEAD"])
        ref = out.strip() if c == 0 and out.strip() else "origin/main"
        c, out, _ = run(["git", "-C", str(repo), "ls-tree", "-r", "--name-only", ref, "--", REPORT_DIR])
        files = out.split() if c == 0 else []
        if c != 0:
            notes.append(f"{ref}에서 리포트 목록을 읽지 못해 작업 트리를 읽음")
            ref = None
    else:
        notes.append(f"git fetch 실패({(err.strip().splitlines() or ['원인 불명'])[0][:120]}) → 작업 트리의 리포트를 읽음")
    if ref is None:
        base = repo / REPORT_DIR
        files = [str(p.relative_to(repo)) for p in base.rglob("*.md")] if base.is_dir() else []

    picked = pick_reports(files, args.count)
    print(f"리포트 출처: {ref or '로컬 작업 트리'} ({repo.name})")
    for n in notes:
        print(f"참고: {n}")
    if not picked:
        print("보안 리포트가 없습니다. audit만 하거나 점검을 멈추세요.")
        return 0
    print("읽은 리포트: " + ", ".join(d for d, _ in picked))
    for d, path in picked:
        if ref:
            _, content, _ = run(["git", "-C", str(repo), "show", f"{ref}:{path}"])
        else:
            content = (repo / path).read_text(encoding="utf-8")
        print(f"\n===== 보안 리포트 {d} ({path}) =====\n{content.rstrip()}")
    return 0


def cmd_inventory(args) -> int:
    scope = resolve_scope(args.root, args.path)
    if args.max_depth:
        scope["max_depth"] = args.max_depth
    if not scope["tops"]:
        print(f"점검할 프로젝트 폴더가 없습니다. ({describe_scope(scope)})", file=sys.stderr)
        for m in scope["missing"]:
            print(f"  찾을 수 없는 경로: {m}", file=sys.stderr)
        return 2
    rules = parse_rules(args.check or [])
    for name in (args.packages or "").split(","):
        if name.strip() and name.strip() not in rules:
            rules[name.strip()] = ""  # 판정 없이 버전만
    data = inventory(scope, rules)
    if args.json:
        print(json.dumps(data, ensure_ascii=False, indent=1, default=sorted))
    else:
        print_inventory(data)
    return 0


def cmd_usage(args) -> int:
    scope = resolve_scope(args.root, args.path)
    if not scope["tops"]:
        print(f"점검할 프로젝트 폴더가 없습니다. ({describe_scope(scope)})", file=sys.stderr)
        return 2
    data = usage(scope, parse_patterns(args.pattern), args.max_files)
    if args.json:
        print(json.dumps(data, ensure_ascii=False, indent=1))
    else:
        print_usage(data)
    return 0


def summarize_npm(data: dict) -> tuple[dict, list[str]]:
    meta = (data.get("metadata") or {}).get("vulnerabilities") or {}
    lines = []
    for name, v in sorted((data.get("vulnerabilities") or {}).items()):
        if v.get("severity") not in ("high", "critical"):
            continue
        sources = [x for x in v.get("via", []) if isinstance(x, dict)]
        title = "; ".join(f"{s.get('title')} {s.get('url', '')}".strip() for s in sources[:2]) or "다른 패키지를 거쳐 영향 받음: " + ", ".join(x for x in v.get("via", []) if isinstance(x, str))
        fix = v.get("fixAvailable")
        fix_text = f"{fix.get('name')}@{fix.get('version')}" + (" (메이저 변경)" if fix.get("isSemVerMajor") else "") if isinstance(fix, dict) else ("있음" if fix else "없음")
        lines.append(f"[{v['severity']}] {name} {v.get('range', '')} — {title} · 고침: {fix_text}")
    return meta, lines


def summarize_pnpm(data: dict) -> tuple[dict, list[str]]:
    meta = (data.get("metadata") or {}).get("vulnerabilities") or {}
    lines = []
    for adv in (data.get("advisories") or {}).values():
        if adv.get("severity") not in ("high", "critical"):
            continue
        installed = sorted({f.get("version") for f in adv.get("findings", []) if f.get("version")})
        lines.append(
            f"[{adv['severity']}] {adv.get('module_name')} {', '.join(installed)} (취약 {adv.get('vulnerable_versions')}, 수정 {adv.get('patched_versions')}) — {adv.get('title')} {adv.get('url', '')}".rstrip()
        )
    return meta, lines


def cmd_audit(args) -> int:
    scope = resolve_scope(args.root, args.path)
    if args.max_depth:
        scope["max_depth"] = args.max_depth
    targets: dict[Path, tuple[str, str]] = {}
    for top in scope["tops"]:
        for proj in find_projects(top, scope["max_depth"]):
            lock = nearest_lock(proj, top)
            if lock:
                targets[lock[0].parent] = (lock[1], str(lock[0].parent.relative_to(top.parent)))
    print(f"점검 대상: {describe_scope(scope)}")
    print(f"audit 대상 {len(targets)}곳 (high·critical만 표시, 파일은 고치지 않음)")
    for d, (kind, label) in sorted(targets.items()):
        if kind == "yarn":
            print(f"\n### {label} (yarn)\n- 건너뜀: yarn 프로젝트 audit는 지원하지 않음")
            continue
        if not shutil.which(kind):
            print(f"\n### {label} ({kind})\n- 건너뜀: {kind} 명령을 찾을 수 없음")
            continue
        code, out, err = run([kind, "audit", "--json"], cwd=d, timeout=args.timeout)
        try:
            data = json.loads(out) if out.strip() else {}
        except ValueError:
            data = {}
        if not data or "error" in data:
            reason = (data.get("error") or {}).get("summary") if isinstance(data.get("error"), dict) else None
            reason = reason or (err.strip().splitlines() or ["출력 없음"])[-1]
            print(f"\n### {label} ({kind})\n- audit 실패: {reason[:200]}")
            continue
        meta, lines = summarize_pnpm(data) if "advisories" in data else summarize_npm(data)
        counts = ", ".join(f"{k} {meta.get(k, 0)}" for k in ("critical", "high", "moderate", "low"))
        print(f"\n### {label} ({kind}) — {counts}")
        for line in lines or ["high·critical 없음"]:
            print(f"- {line}")
    return 0


def cmd_outpath(args) -> int:
    repo = repo_root()
    out = Path(args.out).expanduser().resolve() if args.out else resolve_scope()["out_dir"] / f"{today_kst()}.md"
    if out == repo or repo in out.parents:
        print(f"거부: {out} 은(는) 이 저장소({repo}) 안입니다. 결과에는 프로젝트의 취약 버전 정보가 들어가므로 저장소 밖에 저장하세요.", file=sys.stderr)
        return 2
    print(out)
    return 0


def cmd_config(args) -> int:
    """점검 대상 설정 보기·저장·초기화. 설정 파일은 스킬 폴더의 config.local.json(git 제외)."""
    if args.reset:
        if CONFIG_PATH.exists():
            CONFIG_PATH.unlink()
        print("설정을 지웠습니다. 다음 점검 때 다시 고릅니다.")
        return 0
    if args.auto or args.list:
        cfg: dict = {"mode": "auto" if args.auto else "list"}
        if args.auto:
            root = Path(args.auto).expanduser().resolve()
            if not root.is_dir():
                print(f"폴더가 없습니다: {root}", file=sys.stderr)
                return 2
            cfg.update(root=str(root), exclude=args.exclude or [])
        else:
            paths = [Path(p).expanduser().resolve() for p in args.list]
            bad = [str(p) for p in paths if not p.is_dir()]
            if bad:
                print("폴더가 없습니다: " + ", ".join(bad), file=sys.stderr)
                return 2
            cfg["paths"] = [str(p) for p in paths]
        if args.max_depth:
            cfg["max_depth"] = args.max_depth
        if args.out_dir:
            cfg["out_dir"] = str(Path(args.out_dir).expanduser().resolve())
        CONFIG_PATH.write_text(json.dumps(cfg, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(f"저장했습니다: {CONFIG_PATH}")

    scope = resolve_scope()
    found = [find_projects(t, scope["max_depth"]) for t in scope["tops"]]
    n_proj = sum(len(f) for f in found)
    n_node = sum(1 for f in found if f)
    status = "설정됨" if scope["configured"] else "설정 없음"
    print(f"설정 상태: {status}")
    print(f"점검 대상: {describe_scope(scope)}")
    print(f"미리보기: 폴더 {len(scope['tops'])}곳 중 Node 프로젝트가 있는 곳 {n_node}곳 (package.json {n_proj}개)")
    for m in scope["missing"]:
        print(f"  ⚠ 찾을 수 없는 경로: {m}")
    print(f"결과 저장 폴더: {scope['out_dir']}")
    if not scope["configured"]:
        print(f"참고: 기본값 후보는 이 저장소의 상위 폴더({repo_root().parent})입니다.")
    return 0


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)

    p = sub.add_parser("reports", help="최근 보안 리포트 출력")
    p.add_argument("--count", type=int, default=3, help="읽을 리포트 수 (기본 3)")
    p.set_defaults(func=cmd_reports)

    p = sub.add_parser("config", help="점검 대상 설정 보기·저장")
    g = p.add_mutually_exclusive_group()
    g.add_argument("--auto", metavar="ROOT", help="자동: 이 폴더 아래 프로젝트를 모두 찾기")
    g.add_argument("--list", nargs="+", metavar="PATH", help="지정: 점검할 프로젝트 폴더 목록")
    g.add_argument("--reset", action="store_true", help="설정 지우기")
    p.add_argument("--exclude", nargs="+", metavar="NAME", help="자동 모드에서 건너뛸 폴더 이름")
    p.add_argument("--max-depth", type=int, help=f"프로젝트 폴더 아래 몇 단계까지 찾을지 (기본 {DEFAULT_DEPTH})")
    p.add_argument("--out-dir", help="결과 저장 폴더 (기본: 자동이면 <ROOT>/security-check)")
    p.set_defaults(func=cmd_config)

    p = sub.add_parser("inventory", help="설치 버전·런타임 단서 수집과 판정")
    p.add_argument("--root", help="이번만 자동 모드로 이 폴더 아래를 점검")
    p.add_argument("--path", action="append", help="이번만 이 프로젝트 폴더들을 점검 (여러 번 가능)")
    p.add_argument("--check", action="append", metavar="NAME:RULE", help="예: 'next:>=16.0.0 <16.4.1 || >=13.0.0 <15.5.28'. node·이미지 이름도 가능")
    p.add_argument("--packages", help="판정 없이 버전만 볼 패키지 (쉼표로 구분)")
    p.add_argument("--max-depth", type=int)
    p.add_argument("--json", action="store_true")
    p.set_defaults(func=cmd_inventory)

    p = sub.add_parser("usage", help="사용처 검색 (노출 조건 확인용)")
    p.add_argument("--pattern", action="append", required=True, metavar="NAME=REGEX",
                   help="예: \"use server=^\\s*['\\\"]use server['\\\"]\" (여러 번 가능, 줄 단위로 찾음)")
    p.add_argument("--root", help="이번만 자동 모드로 이 폴더 아래를 점검")
    p.add_argument("--path", action="append", help="이번만 이 프로젝트 폴더들을 점검 (여러 번 가능)")
    p.add_argument("--max-files", type=int, default=3, help="패턴마다 보여 줄 파일 수 (기본 3)")
    p.add_argument("--json", action="store_true")
    p.set_defaults(func=cmd_usage)

    p = sub.add_parser("audit", help="npm/pnpm audit (사용자 동의 후에만)")
    p.add_argument("--root", help="이번만 자동 모드로 이 폴더 아래를 점검")
    p.add_argument("--path", action="append", help="이번만 이 프로젝트 폴더들을 점검 (여러 번 가능)")
    p.add_argument("--max-depth", type=int)
    p.add_argument("--timeout", type=int, default=60)
    p.set_defaults(func=cmd_audit)

    p = sub.add_parser("outpath", help="결과 파일 경로 (저장소 안이면 거부)")
    p.add_argument("--out")
    p.set_defaults(func=cmd_outpath)

    args = ap.parse_args(argv)
    return args.func(args)


if __name__ == "__main__":
    try:
        sys.exit(main())
    except BrokenPipeError:  # `| head`처럼 출력을 중간에 끊어도 조용히 끝낸다
        sys.stderr.close()
        sys.exit(0)
