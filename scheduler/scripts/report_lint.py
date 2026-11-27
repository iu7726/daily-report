"""보고서의 분량과 문체를 검사한다. 루틴이 보고서를 쓴 뒤 커밋하기 전에 실행한다.

표준 라이브러리만 쓴다.

    python3 -I scheduler/scripts/report_lint.py reports/security-daily-report/2026/11/27.md

'고칠 것'은 공통 규칙(`scheduler/CLAUDE.md`)을 어긴 것이고, '참고'는 고치면 좋은 것이다.
종료 코드는 0(고칠 것 없음), 1(고칠 것 있음), 2(파일이나 frontmatter를 읽지 못함)다.

글자 수는 마크다운 기호와 URL을 뺀 글자로 센다. 첫 두 줄(제목, 기준 시각), 코드 블록,
'조사 기록' 절, 긴급 감시·후속 확인 루틴(04)이 덧붙인 절은 본문 분량에서 뺀다.
"""

import argparse
import re
import sys
from pathlib import Path

LOG_SECTION = "조사 기록"
APPENDED_PREFIXES = ("긴급 감시", "후속 확인")  # 04가 리포트 맨 위에 덧붙이는 절

# 작업별 본문 상한(조사 기록 제외)
BUDGETS = {
    "security-daily-report": 6000,
    "ai-dev-briefing": 3500,
    "sp500-morning-check": 2500,
}
SECURITY_HEAVY_ITEMS = 4  # 보안 리포트의 P1·P2 항목이 이만큼 이상이면
SECURITY_HEAVY_BUDGET = 8000

# 작업별 항목 상한: (절 이름, 단위, 상한). "item"은 ### 소제목 하나, "line"은 최상위 목록 한 줄.
ITEM_LIMITS = {
    "security-daily-report": [("주요 항목", "item", 1300), ("참고", "line", 300), ("미확인 보도", "line", 300)],
    "ai-dev-briefing": [("소식", "item", 800), ("짧은 소식", "line", 200), ("주목할 Agent Skills", "item", 700)],
    "sp500-morning-check": [("움직인 이유", "item", 600)],
}

SUMMARY_MAX = 120
SUMMARY_MAX_SENTENCES = 2
LOG_SECTION_WARN = 2500
TIME_WARN = 5

# 본문에 쓰지 않고 조사 기록에 모으는 문형
LOG_PHRASES = ["이상 없음으로 확인한 대상", "확인 실패:", "조사 범위는", "새 버전이 없", "새 글이 없", "조회에 실패한 것은 없"]
# 표 칸에만 쓰는 고정 표기가 문장 끝에 붙은 꼴 ("수정 버전은 확인 불가입니다")
FIXED_LABEL_RE = re.compile(r"(확인 불가|불필요|미등재|이상 없음|해당 없음)(입니다|이며|이고|이지만|이라|였|이었)")
# 할 일은 "~해야 합니다"·"~하면 됩니다"로 쓴다. 명령형은 쓰지 않는다.
IMPERATIVE_RE = re.compile(r"[가-힣]+(세요|십시오)(?=[.!?)\s]|$)")
AVOID_PHRASES = ["눈여겨볼", "볼 만합니다", "것으로 보입니다", "그대로입니다", "바랍니다"]
FRONTMATTER_TEXT_KEYS = ("summary", "headline", "description")  # 사이트·검색 결과·알림에 글자 그대로 보인다
MARKDOWN_RE = re.compile(r"`|\*\*|\]\(")
TIME_RE = re.compile(r"\d{1,2}:\d{2}\s*(?:KST|UTC|PST|PDT|EST|EDT|ET)\b")

LINK_RE = re.compile(r"\[([^\]]*)\]\([^)]*\)")
URL_RE = re.compile(r"https?://\S+")
HEADING_RE = re.compile(r"^(#{1,2})\s+(.*)$")
NUM_PREFIX_RE = re.compile(r"^\d+\.\s*")
SENTENCE_SPLIT_RE = re.compile(r"(?<=[.!?])\s+")
SENTENCE_END_RE = re.compile(r"[.!?](?=\s|$)")
REFERENCE_RE = re.compile(r"^(원문|출처|발표|설치):")  # 출처·설치 줄은 문장 검사에서 뺀다
TABLE_RULE_RE = re.compile(r"\|?\s*:?-{3,}.*")


def visible(text: str) -> str:
    """마크다운 기호와 URL을 뺀, 화면에 보이는 글자."""
    text = LINK_RE.sub(r"\1", text)
    text = URL_RE.sub("", text)
    out = []
    for line in text.splitlines():
        s = line.strip()
        if TABLE_RULE_RE.fullmatch(s):
            continue
        s = re.sub(r"^(#{1,6}|>|[-*]|\d+\.)\s*", "", s)
        s = s.replace("**", "").replace("`", "").replace("|", " ")
        out.append(s)
    return re.sub(r"\s+", " ", " ".join(out)).strip()


def sentences(text: str) -> list[str]:
    return [s for s in SENTENCE_SPLIT_RE.split(text) if s.strip()]


def sentence_count(text: str) -> int:
    """문장 끝 부호로 센다. 끝에 붙은 '· 출처 링크' 조각은 문장으로 세지 않는다."""
    return len(SENTENCE_END_RE.findall(text))


def parse_frontmatter(text: str):
    """(frontmatter dict, 본문)을 돌려준다. frontmatter가 없으면 (None, text)."""
    text = text.replace("\r\n", "\n")
    if not text.startswith("---\n"):
        return None, text
    end = text.find("\n---", 3)
    if end == -1:
        return None, text
    fm = {}
    for line in text[4:end].splitlines():
        m = re.match(r"^([A-Za-z_]+):\s*(.*)$", line)
        if not m:
            continue
        value = m.group(2).strip()
        if len(value) >= 2 and value[0] == '"' and value[-1] == '"':
            value = value[1:-1].replace('\\"', '"').replace("\\\\", "\\")
        fm[m.group(1)] = value
    body = text[end + 4 :]
    return fm, body.lstrip("\n")


def split_sections(body: str) -> list[tuple[str, list[str]]]:
    """첫 두 줄(제목, 기준 시각)과 코드 블록을 빼고 h1·h2 소제목으로 나눈다. 첫 소제목 앞은 이름이 ""다."""
    lines = body.split("\n")
    i = 0
    for pattern in (r"^\[.*\]$", r"^기준 시각"):
        while i < len(lines) and not lines[i].strip():
            i += 1
        if i < len(lines) and re.match(pattern, lines[i].strip()):
            i += 1
    sections, name, buf, in_fence = [], "", [], False
    for line in lines[i:]:
        if line.strip().startswith("```"):
            in_fence = not in_fence
            continue
        if in_fence:
            continue
        m = HEADING_RE.match(line)
        if m:
            sections.append((name, buf))
            name, buf = NUM_PREFIX_RE.sub("", m.group(2).strip()), []
        else:
            buf.append(line)
    sections.append((name, buf))
    return [(n, b) for n, b in sections if n or any(x.strip() for x in b)]


def split_items(lines: list[str]) -> list[tuple[str, str]]:
    """### 소제목 단위로 나눈다."""
    items, title, buf = [], None, []
    for line in lines:
        if line.startswith("### "):
            if title is not None:
                items.append((title, "\n".join(buf)))
            title, buf = line[4:].strip(), []
        elif title is not None:
            buf.append(line)
    if title is not None:
        items.append((title, "\n".join(buf)))
    return items


def split_bullets(lines: list[str]) -> list[str]:
    """최상위 목록 한 줄과 그 아래 들여 쓴 줄을 묶는다."""
    out, cur = [], None
    for line in lines:
        if re.match(r"^[-*]\s+", line):
            if cur:
                out.append("\n".join(cur))
            cur = [line]
        elif cur is not None and line.startswith(("  ", "\t")) and line.strip():
            cur.append(line)
        elif cur is not None:
            out.append("\n".join(cur))
            cur = None
    if cur:
        out.append("\n".join(cur))
    return out


def prose_units(lines: list[str]) -> list[str]:
    """표와 소제목을 뺀 문단·인용·목록 항목. 문장 단위 검사에 쓴다."""
    units, buf = [], []

    def flush():
        if buf:
            units.append(" ".join(buf))
            buf.clear()

    for line in lines + [""]:
        s = line.strip()
        if not s or s.startswith(("|", "#")):
            flush()
        elif re.match(r"^([-*]|\d+\.)\s+", s):
            flush()
            buf.append(s)
        else:
            buf.append(re.sub(r"^>\s*", "", s))
    flush()
    return [visible(u) for u in units if visible(u)]


def short(text: str, n: int = 40) -> str:
    text = text.strip()
    return text if len(text) <= n else text[:n] + "…"


def lint(path: Path):
    """(고칠 것 목록, 참고 목록, 요약 줄)을 돌려준다. 읽지 못하면 ValueError."""
    try:
        text = path.read_text(encoding="utf-8")
    except OSError as e:
        raise ValueError(f"읽기 실패: {e}") from e
    fm, body = parse_frontmatter(text)
    if fm is None:
        raise ValueError("frontmatter가 없습니다")
    task = fm.get("task", "")
    sections = split_sections(body)
    fixes, notes = [], []

    log = [(n, b) for n, b in sections if n == LOG_SECTION]
    own = [(n, b) for n, b in sections if n != LOG_SECTION and not n.startswith(APPENDED_PREFIXES)]

    # 조사 기록 절
    named = [n for n, _ in sections if n and not n.startswith(APPENDED_PREFIXES)]
    if not log:
        fixes.append("조사 기록: 마지막 절 `## 조사 기록`이 없습니다.")
    elif named[-1] != LOG_SECTION:
        fixes.append(f"조사 기록: `## 조사 기록`이 마지막 절이 아닙니다(마지막은 '{named[-1]}').")

    # 본문 분량
    lengths = [(n or "(첫 소제목 앞)", len(visible("\n".join(b)))) for n, b in own]
    total = sum(n for _, n in lengths)
    log_len = sum(len(visible("\n".join(b))) for _, b in log)
    budget = BUDGETS.get(task)
    p12 = sum(1 for _, b in own for line in b if line.startswith("### ") and re.search(r"\[P[12]\]", line))
    if task == "security-daily-report" and p12 >= SECURITY_HEAVY_ITEMS:
        budget = SECURITY_HEAVY_BUDGET
    if budget and total > budget:
        longest = ", ".join(f"{n} {c:,}자" for n, c in sorted(lengths, key=lambda x: -x[1])[:3])
        fixes.append(f"분량: 본문 {total:,}자, 상한 {budget:,}자. 긴 절: {longest}")
    if log_len > LOG_SECTION_WARN:
        notes.append(f"조사 기록이 {log_len:,}자입니다({LOG_SECTION_WARN:,}자 안팎 권장).")

    # 항목 분량
    for section, unit, limit in ITEM_LIMITS.get(task, []):
        for name, lines in own:
            if name != section and not name.startswith(section + " "):
                continue
            if unit == "item":
                for title, item in split_items(lines):
                    n = len(visible(f"{title}\n{item}"))
                    if n > limit:
                        fixes.append(f"항목 분량: '{section}'의 '{short(title)}' {n:,}자, 상한 {limit:,}자")
            else:
                for bullet in split_bullets(lines):
                    n = len(visible(bullet))
                    if n > limit:
                        fixes.append(f"항목 분량: '{section}'의 '{short(visible(bullet), 24)}' {n:,}자, 상한 {limit:,}자")

    # summary
    summary = visible(fm.get("summary", ""))
    if not summary:
        fixes.append("summary: 비어 있습니다.")
    else:
        count = sentence_count(summary)
        if len(summary) > SUMMARY_MAX or count > SUMMARY_MAX_SENTENCES:
            fixes.append(f"summary: {len(summary)}자 {count}문장, 상한 {SUMMARY_MAX}자 {SUMMARY_MAX_SENTENCES}문장")
        if IMPERATIVE_RE.search(summary):
            fixes.append("summary: 명령형(~세요, ~십시오)이 있습니다. '~해야 합니다'나 '~하면 됩니다'로 씁니다.")

    for key in FRONTMATTER_TEXT_KEYS:
        if MARKDOWN_RE.search(fm.get(key, "")):
            fixes.append(f"{key}: 마크다운(백틱, 굵게, 링크)이 있습니다. 화면에 글자 그대로 보이므로 뺍니다.")

    # 문장 검사 (본문만)
    phrase_hits, label_hits, imperative_hits, avoid_hits = {}, [], [], {}
    paren_hits, long_paragraphs, times = [], [], 0
    for name, lines in own:
        where = name or "(첫 소제목 앞)"
        text = visible("\n".join(lines))
        for phrase in LOG_PHRASES:
            if phrase in text:
                phrase_hits.setdefault(phrase, []).append(where)
        for phrase in AVOID_PHRASES:
            if phrase in text:
                avoid_hits[phrase] = avoid_hits.get(phrase, 0) + text.count(phrase)
        times += len(TIME_RE.findall("\n".join(lines)))
        for unit in prose_units(lines):
            if REFERENCE_RE.match(unit):
                continue
            sents = sentences(unit)
            count = sentence_count(unit)
            if count >= 4:
                long_paragraphs.append(f"{where}: '{short(unit)}' {count}문장")
            for s in sents:
                for m in FIXED_LABEL_RE.finditer(s):
                    label_hits.append(f"{where}: '{m.group(0)}'")
                for m in IMPERATIVE_RE.finditer(s):
                    imperative_hits.append(f"{where}: '{m.group(0)}'")
                if s.count("(") >= 2:
                    paren_hits.append(f"{where}: '{short(s)}'")

    for phrase, places in phrase_hits.items():
        fixes.append(f"조사 기록 문형이 본문에 있음: \"{phrase}\" ({', '.join(dict.fromkeys(places))}). 조사 기록으로 옮깁니다.")
    if label_hits:
        fixes.append(f"고정 표기를 문장에 씀 {len(label_hits)}곳: {'; '.join(label_hits[:3])}. 문장에서는 풀어 씁니다.")
    if imperative_hits:
        fixes.append(f"명령형 {len(imperative_hits)}곳: {'; '.join(imperative_hits[:3])}. '~해야 합니다'나 '~하면 됩니다'로 씁니다.")
    if long_paragraphs:
        notes.append(f"4문장 이상인 문단 {len(long_paragraphs)}개: {'; '.join(long_paragraphs[:3])}")
    if paren_hits:
        notes.append(f"괄호가 두 개 이상인 문장 {len(paren_hits)}개: {'; '.join(paren_hits[:3])}")
    if times >= TIME_WARN:
        notes.append(f"본문의 시각 표기 {times}개. 할 일에 영향이 있을 때만 씁니다.")
    for phrase, count in avoid_hits.items():
        notes.append(f"피할 문형 \"{phrase}\" {count}번")

    scope = f"상한 {budget:,}자" if budget else "상한 없음"
    head = f"본문 {total:,}자({scope}), 조사 기록 {log_len:,}자, summary {len(summary)}자"
    if task == "security-daily-report":
        head += f", P1·P2 항목 {p12}건"
    return fixes, notes, head


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description="보고서 분량·문체 검사")
    parser.add_argument("path", help="보고서 파일 (reports/<작업 ID>/YYYY/MM/DD.md)")
    args = parser.parse_args(argv)
    path = Path(args.path)
    try:
        fixes, notes, head = lint(path)
    except ValueError as e:
        print(f"{path}: {e}", file=sys.stderr)
        return 2
    print(f"{path}: {head}")
    if fixes:
        print(f"고칠 것 {len(fixes)}개")
        for f in fixes:
            print(f"- {f}")
    else:
        print("고칠 것 없음")
    if notes:
        print("참고")
        for n in notes:
            print(f"- {n}")
    return 1 if fixes else 0


if __name__ == "__main__":
    sys.exit(main())
