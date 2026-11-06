"""NVD에 새로 공개된 CVE 중 점검 대상 제품(npm 밖 서버·DB·인프라)에 해당하는 것을 고른다.

보안 루틴(03)과 긴급 감시(04)가 쓴다. 표준 라이브러리만 쓴다.

    python3 -I scheduler/scripts/nvd_scan.py --hours 48
    python3 -I scheduler/scripts/nvd_scan.py --start 2026-11-04T23:25:00Z --end 2026-11-05T23:25:00Z

1. NVD API에서 공개 시각(`pubStartDate`~`pubEndDate`, UTC)으로 구간 전체를 받는다.
2. 설명에 대상 키워드가 있는 CVE만 남긴다.
3. 남은 CVE는 CVE.org 기록의 영향 제품(vendor·product)을 받아, 대상 제품 자체인지 가른다.
   설명에 이름만 나온 다른 제품(예: nginx용 ModSecurity, Kubernetes 위의 Kubeflow)을 걸러 내려는 것이다.

출력의 `alert`는 긴급 감시 기준(CVSS 9.0 이상, 또는 8.0 이상이면서 AV:N·PR:N)을 넘은 대상 제품 CVE다.
NVD 조회에 실패하면 종료 코드 2로 끝난다. 실패를 "신규 없음"으로 읽지 않게 하려는 것이다.
"""

import argparse
import json
import re
import sys
import time
import urllib.parse
import urllib.request
from datetime import datetime, timedelta, timezone

NVD_URL = "https://services.nvd.nist.gov/rest/json/cves/2.0"
CVE_ORG_URL = "https://cveawg.mitre.org/api/cve/"
UA = "daily-report-security-routine"
KST = timezone(timedelta(hours=9))

# 설명에서 찾는 이름. Git만 대소문자를 가린다("a git repository" 같은 일반 표현을 덜 잡으려고).
DESC_KEYWORDS = re.compile(
    r"(?i:\b(?:openssh|openssl|nginx|postgresql|mysql|mariadb|mongodb|redis|valkey|docker|containerd|runc|buildkit"
    r"|kubernetes|gitlab|node\.js|elasticsearch|opensearch)\b)|\bGit\b"
)
# CVE.org 영향 제품(vendor·product)에서 대상 제품으로 보는 이름.
TARGET_PRODUCTS = re.compile(
    r"(?i)openssh|openssl|nginx|postgres|mysql|mariadb|mongodb|redis|valkey|docker|moby|containerd|runc|buildkit"
    r"|kubernetes|gitlab|nodejs|node\.js|elasticsearch|opensearch|^git$"
)


def fetch_json(url, timeout=60, tries=2):
    last = None
    for attempt in range(tries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=timeout) as res:
                return json.load(res)
        except Exception as e:  # noqa: BLE001 - 실패 원인을 그대로 보고한다
            last = e
            if attempt + 1 < tries:
                time.sleep(6)
    raise RuntimeError(f"{url} 조회 실패: {last}")


def nvd_time(dt):
    return dt.strftime("%Y-%m-%dT%H:%M:%S.000Z")


def parse_utc(text):
    return datetime.fromisoformat(text.replace("Z", "+00:00")).astimezone(timezone.utc)


def fetch_nvd(start, end):
    vulns, index, total = [], 0, None
    while total is None or index < total:
        query = urllib.parse.urlencode(
            {"pubStartDate": nvd_time(start), "pubEndDate": nvd_time(end), "resultsPerPage": 2000, "startIndex": index}
        )
        data = fetch_json(f"{NVD_URL}?{query}")
        total = data["totalResults"]
        page = data.get("vulnerabilities", [])
        vulns.extend(page)
        index += len(page)
        if not page:
            break
        if index < total:
            time.sleep(6)  # 키 없이 30초에 5회 제한
    return vulns, total


def best_metric(cve):
    """CVSS v4.0 → v3.1 → v3.0 순서로 첫 점수(출처 무관)."""
    metrics = cve.get("metrics", {})
    for key in ("cvssMetricV40", "cvssMetricV31", "cvssMetricV30"):
        if metrics.get(key):
            data = metrics[key][0]["cvssData"]
            return data.get("baseScore"), data.get("vectorString", "")
    return None, ""


def affected_products(cve_id):
    try:
        record = fetch_json(CVE_ORG_URL + cve_id, timeout=30)
    except RuntimeError:
        return None
    pairs = []
    containers = record.get("containers", {})
    for container in [containers.get("cna", {})] + containers.get("adp", []):
        for item in container.get("affected", []) or []:
            pairs.append((item.get("vendor", "n/a"), item.get("product", "n/a")))
    return pairs


def is_alert(score, vector):
    if score is None:
        return False
    return score >= 9.0 or (score >= 8.0 and "AV:N" in vector and "PR:N" in vector)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--hours", type=float, help="지금부터 거슬러 올라갈 시간")
    parser.add_argument("--start", help="구간 시작 (UTC, 예: 2026-11-05T00:00:00Z)")
    parser.add_argument("--end", help="구간 끝 (UTC)")
    args = parser.parse_args()

    end = parse_utc(args.end) if args.end else datetime.now(timezone.utc)
    if args.start:
        start = parse_utc(args.start)
    elif args.hours:
        start = end - timedelta(hours=args.hours)
    else:
        parser.error("--hours 또는 --start가 필요합니다")

    try:
        vulns, total = fetch_nvd(start, end)
    except RuntimeError as e:
        print(f"NVD 조회 실패: {e}", file=sys.stderr)
        sys.exit(2)

    print(
        f"NVD 구간 {start.astimezone(KST):%Y-%m-%d %H:%M} ~ {end.astimezone(KST):%Y-%m-%d %H:%M} KST: "
        f"전체 {total}건"
    )

    targets, keyword_only = [], []
    for v in vulns:
        cve = v["cve"]
        desc = next((d["value"] for d in cve.get("descriptions", []) if d["lang"] == "en"), "")
        match = DESC_KEYWORDS.search(desc)
        if not match:
            continue
        products = affected_products(cve["id"])
        score, vector = best_metric(cve)
        published = cve["published"]  # NVD는 시간대 없이 UTC로 준다
        if not published.endswith("Z") and "+" not in published:
            published += "Z"
        entry = {
            "id": cve["id"],
            "published_kst": parse_utc(published).astimezone(KST).strftime("%Y-%m-%d %H:%M"),
            "status": cve.get("vulnStatus"),
            "cvss": score,
            "vector": vector,
            "keyword": match.group(0),
            "affected": [f"{vendor} / {product}" for vendor, product in products] if products is not None else "확인 불가",
            "nvd": f"https://nvd.nist.gov/vuln/detail/{cve['id']}",
            "description": desc[:400],
        }
        is_target = products is None or any(
            TARGET_PRODUCTS.search(vendor) or TARGET_PRODUCTS.search(product) for vendor, product in products
        )
        if is_target:
            entry["alert"] = is_alert(score, vector)
            targets.append(entry)
        else:
            keyword_only.append(entry)

    print(f"대상 제품 {len(targets)}건 (영향 제품을 확인하지 못한 것 포함)")
    for entry in targets:
        print(json.dumps(entry, ensure_ascii=False))
    print(f"설명에 이름만 나온 다른 제품 {len(keyword_only)}건 (참고용)")
    for entry in keyword_only:
        print(f"- {entry['id']} {entry['cvss']} {', '.join(entry['affected'])} | {entry['description'][:100]}")


if __name__ == "__main__":
    main()
