"""collect.py 단위 테스트. 실행: python3 -m unittest discover -s .claude/skills/security-check/tests"""
import io
import json
import os
import sys
import tempfile
import unittest
from contextlib import redirect_stderr, redirect_stdout
from pathlib import Path
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import collect  # noqa: E402

NPM_V3 = json.dumps({
    "lockfileVersion": 3,
    "packages": {
        "": {"name": "app"},
        "node_modules/next": {"version": "16.3.2"},
        "node_modules/@babel/core": {"version": "7.24.0"},
        "node_modules/foo/node_modules/undici": {"version": "6.20.0"},
        "node_modules/undici": {"version": "7.30.2"},
        "packages/web": {"name": "web", "version": "0.1.0"},
    },
})
NPM_V1 = json.dumps({
    "lockfileVersion": 1,
    "dependencies": {
        "next": {"version": "15.5.0", "dependencies": {"undici": {"version": "6.1.0"}}},
        "local": {"version": "file:../local"},
    },
})
PNPM_V9 = """lockfileVersion: '9.0'

importers:

  .:
    dependencies:
      next:
        specifier: ^16.0.0
        version: 16.4.0(react@19.3.0)

packages:

  '@babel/core@7.24.0':
    resolution: {integrity: sha512-x}

  next@16.4.0:
    resolution: {integrity: sha512-y}

snapshots:

  next@16.4.0(react@19.3.0):
    dependencies:
      react: 19.3.0
"""
PNPM_V6 = """lockfileVersion: '6.0'

packages:

  /next@15.5.27(react@18.2.0):
    resolution: {integrity: sha512-z}
    dev: false

  /@types/node@20.11.0:
    dev: true
"""
PNPM_V5 = """lockfileVersion: 5.4

packages:

  /undici/5.28.4:
    dev: false

  /@scope/pkg/1.2.3_react@18.2.0:
    dev: false
"""
YARN_V1 = '''# yarn lockfile v1


"@babel/core@^7.0.0", "@babel/core@^7.24.0":
  version "7.24.0"
  resolved "https://registry.yarnpkg.com/x"

next@^16.0.0:
  version "16.4.1"
'''
YARN_BERRY = '''__metadata:
  version: 8

"next@npm:^16.0.0":
  version: 16.2.0
  resolution: "next@npm:16.2.0"
'''


class LockParsers(unittest.TestCase):
    def test_npm_v3_nested_and_scoped(self):
        found = collect.parse_npm_lock(NPM_V3)
        self.assertEqual(found["next"], {"16.3.2"})
        self.assertEqual(found["@babel/core"], {"7.24.0"})
        self.assertEqual(found["undici"], {"6.20.0", "7.30.2"})  # 중첩 의존성까지
        self.assertNotIn("web", found)  # 워크스페이스 항목은 패키지가 아님

    def test_npm_v1(self):
        found = collect.parse_npm_lock(NPM_V1)
        self.assertEqual(found["next"], {"15.5.0"})
        self.assertEqual(found["undici"], {"6.1.0"})
        self.assertNotIn("local", found)  # file: 버전은 버림

    def test_pnpm_v9_v6_v5(self):
        v9 = collect.parse_pnpm_lock(PNPM_V9)
        self.assertEqual(v9["next"], {"16.4.0"})
        self.assertEqual(v9["@babel/core"], {"7.24.0"})
        self.assertNotIn("react", v9)  # snapshots 안쪽 들여쓴 줄은 읽지 않음
        v6 = collect.parse_pnpm_lock(PNPM_V6)
        self.assertEqual(v6["next"], {"15.5.27"})
        self.assertEqual(v6["@types/node"], {"20.11.0"})
        v5 = collect.parse_pnpm_lock(PNPM_V5)
        self.assertEqual(v5["undici"], {"5.28.4"})
        self.assertEqual(v5["@scope/pkg"], {"1.2.3"})

    def test_yarn_v1_and_berry(self):
        v1 = collect.parse_yarn_lock(YARN_V1)
        self.assertEqual(v1["@babel/core"], {"7.24.0"})
        self.assertEqual(v1["next"], {"16.4.1"})
        berry = collect.parse_yarn_lock(YARN_BERRY)
        self.assertEqual(berry["next"], {"16.2.0"})
        self.assertNotIn("__metadata", berry)


class VersionRules(unittest.TestCase):
    RULE = ">=16.0.0 <16.4.1 || >=13.0.0 <15.5.28"

    def test_full_versions(self):
        cv = collect.check_version
        self.assertEqual(cv("16.3.2", self.RULE), "vulnerable")
        self.assertEqual(cv("16.4.1", self.RULE), "safe")
        self.assertEqual(cv("15.5.27", self.RULE), "vulnerable")
        self.assertEqual(cv("15.5.28", self.RULE), "safe")
        self.assertEqual(cv("12.9.9", self.RULE), "safe")
        self.assertEqual(cv("16.4.0-canary.3", self.RULE), "vulnerable")
        self.assertEqual(cv("v22.23.3", "<22.23.4"), "vulnerable")
        self.assertEqual(cv("1.2.3", "=1.2.3"), "vulnerable")
        self.assertEqual(cv("1.2.4", "<=1.2.3"), "safe")

    def test_partial_versions(self):
        cv = collect.check_version
        node = ">=24.0.0 <24.22.1 || >=22.0.0 <22.23.4"
        self.assertEqual(cv("24", node), "unclear")  # 24.x는 일부만 취약
        self.assertEqual(cv("24-alpine", node), "unclear")
        self.assertEqual(cv("20", node), "safe")
        self.assertEqual(cv("22.23", node), "unclear")
        self.assertEqual(cv("21", "<22.0.0"), "vulnerable")  # 21.x 전체가 취약 범위
        self.assertEqual(cv("lts-alpine", node), "unparsed")
        # 뒤쪽 구간이 통째로 포함하면 앞쪽에서 일부만 겹쳐도 취약
        self.assertEqual(cv("1", ">=1.5.0 <2.0.0 || <2.0.0"), "vulnerable")

    def test_rule_parsing(self):
        rules = collect.parse_rules(["next:<16.4.1", "next:>=13 <15.5.28", "node:<24.22.1"])
        self.assertEqual(rules["next"], "<16.4.1 || >=13 <15.5.28")
        with self.assertRaises(SystemExit):
            collect.parse_rules(["next"])


class Reports(unittest.TestCase):
    def test_pick_prefers_new_layout_and_latest(self):
        base = collect.REPORT_DIR
        paths = [
            f"{base}/2026-11-01.md",
            f"{base}/2026/11/01.md",
            f"{base}/2026/11/02.md",
            f"{base}/2026/10/31.md",
            f"{base}/README.md",
        ]
        picked = collect.pick_reports(paths, 2)
        self.assertEqual(picked, [("2026-11-02", f"{base}/2026/11/02.md"), ("2026-11-01", f"{base}/2026/11/01.md")])


class OutPath(unittest.TestCase):
    def run_outpath(self, out):
        buf_out, buf_err = io.StringIO(), io.StringIO()
        with redirect_stdout(buf_out), redirect_stderr(buf_err):
            code = collect.main(["outpath", "--out", out])
        return code, buf_out.getvalue().strip(), buf_err.getvalue()

    def test_rejects_inside_repo(self):
        repo = collect.repo_root()
        code, _, err = self.run_outpath(str(repo / "security-check" / "x.md"))
        self.assertEqual(code, 2)
        self.assertIn("저장소", err)

    def test_accepts_outside_repo(self):
        with tempfile.TemporaryDirectory() as tmp:
            code, out, _ = self.run_outpath(str(Path(tmp) / "x.md"))
            self.assertEqual(code, 0)
            self.assertTrue(out.endswith("x.md"))


class Inventory(unittest.TestCase):
    def test_lockfile_and_runtime_hints(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            app = root / "app"
            (app / "apps" / "web").mkdir(parents=True)
            (app / "package.json").write_text(json.dumps({"name": "app", "dependencies": {"next": "^16.0.0"}}))
            (app / "apps" / "web" / "package.json").write_text(json.dumps({"name": "web", "dependencies": {"next": "^16.0.0"}}))
            (app / "package-lock.json").write_text(NPM_V3)
            (app / "Dockerfile").write_text("FROM node:24-alpine AS build\nFROM nginx:1.27\n")
            (app / ".nvmrc").write_text("24.22.1\n")
            nolock = root / "nolock"
            nolock.mkdir()
            (nolock / "package.json").write_text(json.dumps({"dependencies": {"next": "^15.0.0"}}))

            scope = collect.resolve_scope(root_arg=str(root))
            data = collect.inventory(scope, {"next": "<16.4.1", "node": "<24.22.1"})
            app_projects = {p["path"]: p for p in data["repos"]["app"]["projects"]}
            self.assertEqual(app_projects["app"]["packages"]["next"]["installed"], {"16.3.2": "vulnerable"})
            # 하위 프로젝트는 상위 lockfile을 쓴다(S3)
            self.assertEqual(app_projects["app/apps/web"]["lockfile"], "app/package-lock.json")
            hints = {(h["kind"], h["name"], h["version"]): h.get("result") for h in data["repos"]["app"]["hints"]}
            self.assertEqual(hints[("runtime", "node", "24-alpine")], "unclear")
            self.assertEqual(hints[("runtime", "node", "24.22.1")], "safe")
            self.assertIn(("image", "nginx", "1.27"), hints)
            # lockfile이 없으면 설치 버전 불명(S2)
            self.assertEqual(data["repos"]["nolock"]["projects"][0]["packages"]["next"]["installed"], {})


class Scope(unittest.TestCase):
    """점검 대상 설정: 자동(한 폴더 아래 전부) / 지정(폴더 목록), 우선순위."""

    def setUp(self):
        tmp = tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        self.root = Path(tmp.name).resolve()
        self.cfg = self.root / "config.local.json"
        for patcher in (mock.patch.object(collect, "CONFIG_PATH", self.cfg), mock.patch.dict(os.environ)):
            patcher.start()
            self.addCleanup(patcher.stop)
        os.environ.pop("SECURITY_CHECK_ROOT", None)
        for name in ("a", "b", "archive"):
            (self.root / "ws" / name).mkdir(parents=True)
            (self.root / "ws" / name / "package.json").write_text("{}")
        (self.root / "elsewhere" / "proj").mkdir(parents=True)
        (self.root / "elsewhere" / "proj" / "package.json").write_text("{}")

    def cli(self, *argv):
        out, err = io.StringIO(), io.StringIO()
        with redirect_stdout(out), redirect_stderr(err):
            code = collect.main(list(argv))
        return code, out.getvalue(), err.getvalue()

    def test_default_is_auto_on_parent_of_repo(self):
        scope = collect.resolve_scope()
        self.assertEqual((scope["mode"], scope["configured"]), ("auto", False))
        self.assertEqual(scope["root"], str(collect.repo_root().parent))
        self.assertIn("설정 없음", self.cli("config")[1])

    def test_auto_with_exclude(self):
        code, out, _ = self.cli("config", "--auto", str(self.root / "ws"), "--exclude", "archive")
        self.assertEqual(code, 0)
        self.assertIn("설정됨", out)
        scope = collect.resolve_scope()
        self.assertEqual([t.name for t in scope["tops"]], ["a", "b"])
        self.assertEqual(scope["out_dir"], self.root / "ws" / "security-check")

    def test_list_with_scattered_paths(self):
        self.cli("config", "--list", str(self.root / "ws" / "a"), str(self.root / "elsewhere" / "proj"))
        scope = collect.resolve_scope()
        self.assertEqual((scope["mode"], len(scope["tops"])), ("list", 2))
        # 지정한 폴더 자체가 프로젝트여도 찾는다
        self.assertEqual(collect.find_projects(scope["tops"][1], 3), [scope["tops"][1]])

    def test_list_rejects_missing_path(self):
        code, _, err = self.cli("config", "--list", str(self.root / "nope"))
        self.assertEqual(code, 2)
        self.assertIn("폴더가 없습니다", err)
        self.assertFalse(self.cfg.exists())

    def test_precedence_option_env_config(self):
        self.cli("config", "--list", str(self.root / "ws" / "a"))
        self.assertEqual(collect.resolve_scope()["source"], "설정 파일")
        os.environ["SECURITY_CHECK_ROOT"] = str(self.root / "ws")
        self.assertEqual(collect.resolve_scope()["source"], "환경 변수(SECURITY_CHECK_ROOT)")
        self.assertEqual(collect.resolve_scope(paths_arg=[str(self.root / "elsewhere")])["mode"], "list")

    def test_reset(self):
        self.cli("config", "--auto", str(self.root / "ws"))
        self.cli("config", "--reset")
        self.assertFalse(self.cfg.exists())
        self.assertFalse(collect.resolve_scope()["configured"])


if __name__ == "__main__":
    unittest.main()
