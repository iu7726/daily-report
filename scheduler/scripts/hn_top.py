"""Hacker News에서 최근 화제가 된 글 제목을 뽑는다. 보안 루틴(03)이 공식 목록에서 놓친 사건이 없는지 대조할 때 쓴다.

    python3 -I scheduler/scripts/hn_top.py --hours 24 --points 100

Algolia가 제공하는 Hacker News 공식 검색 API를 쓴다. 제목에 보안 단어가 있으면 `[보안]`을 붙이지만,
"sshole"처럼 취약점에 별명을 붙인 제목은 단어로 못 잡으니 나머지 제목도 함께 훑어야 한다.
조회에 실패하면 종료 코드 2로 끝난다.
"""

import argparse
import json
import re
import sys
import time
import urllib.request

API = "https://hn.algolia.com/api/v1/search_by_date"
UA = "daily-report-security-routine"
SECURITY = re.compile(
    r"CVE-|vulnerab|exploit|bypass|backdoor|malware|malicious|compromis|breach|leak|RCE|remote code|zero-day|0-day"
    r"|supply.chain|hijack|security (advisory|update|release|flaw|bug|fix)|patch|attack|ransomware|phishing|stolen",
    re.I,
)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--hours", type=float, default=24)
    parser.add_argument("--points", type=int, default=100)
    args = parser.parse_args()

    since = int(time.time() - args.hours * 3600)
    url = f"{API}?tags=story&hitsPerPage=500&numericFilters=created_at_i%3E{since},points%3E%3D{args.points}"
    try:
        req = urllib.request.Request(url, headers={"User-Agent": UA})
        with urllib.request.urlopen(req, timeout=30) as res:
            hits = json.load(res)["hits"]
    except Exception as e:  # noqa: BLE001
        print(f"Hacker News 조회 실패: {e}", file=sys.stderr)
        sys.exit(2)

    hits.sort(key=lambda h: h.get("points") or 0, reverse=True)
    print(f"Hacker News 최근 {args.hours:g}시간, {args.points}점 이상 글 {len(hits)}개")
    for h in hits:
        mark = "[보안] " if SECURITY.search(h.get("title") or "") else ""
        link = h.get("url") or f"https://news.ycombinator.com/item?id={h['objectID']}"
        print(f"{mark}{h.get('points')}점 {h['created_at'][:16]}Z | {h.get('title')} | {link}")


if __name__ == "__main__":
    main()
