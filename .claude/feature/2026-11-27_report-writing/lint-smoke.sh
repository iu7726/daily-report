#!/usr/bin/env bash
# 검사 스크립트(report_lint.py)를 원본 리포트와 샘플에 돌려 종료 코드를 확인한다. 저장소 루트에서 실행한다.
#   bash .claude/feature/2026-11-27_report-writing/lint-smoke.sh
set -u
lint="python3 -I scheduler/scripts/report_lint.py"
sample=".claude/feature/2026-11-27_report-writing/sample"
fail=0

check() {
  local path="$1" expected="$2"
  echo "== $path (기대 종료 코드 $expected)"
  $lint "$path"
  local code=$?
  echo "-> 종료 코드 $code"
  echo
  [ "$code" = "$expected" ] || fail=1
}

check reports/security-daily-report/2026/11/26.md 1
check reports/ai-dev-briefing/2026/11/27.md 1
check reports/sp500-morning-check/2026/11/27.md 1
check "$sample/security-daily-report-2026-11-26.md" 0
check "$sample/ai-dev-briefing-2026-11-27.md" 0
check "$sample/no-such-file.md" 2

if [ "$fail" = 0 ]; then echo "모두 기대한 종료 코드"; else echo "기대와 다른 종료 코드가 있음"; fi
exit "$fail"
