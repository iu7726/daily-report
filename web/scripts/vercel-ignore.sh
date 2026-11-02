#!/usr/bin/env bash
# Vercel "Ignored Build Step". 종료 코드 0 = 빌드 건너뜀, 1 = 빌드.
# 0과 1 말고 다른 값이 나오면 Vercel이 배포를 오류로 처리하므로, 어떤 경우에도 둘 중 하나로 끝낸다.
# 기준: 마지막 성공 배포 커밋(VERCEL_GIT_PREVIOUS_SHA) 이후 web/ 또는 reports/가 바뀌었는지.

BASE="${VERCEL_GIT_PREVIOUS_SHA:-}"

# 기준 커밋이 없거나(첫 배포), 이력을 다시 써서 사라졌거나, 얕은 clone이라 받아 오지 않았으면 빌드한다.
if [ -z "$BASE" ] || ! git cat-file -e "${BASE}^{commit}" 2>/dev/null; then
  echo "기준 커밋(${BASE:-없음})을 찾을 수 없어 빌드합니다."
  exit 1
fi

if git diff --quiet "$BASE" HEAD -- . ../reports 2>/dev/null; then
  echo "web/·reports/ 변경 없음(${BASE:0:7}..HEAD): 빌드를 건너뜁니다."
  exit 0
fi

echo "web/ 또는 reports/ 변경 있음(${BASE:0:7}..HEAD): 빌드합니다."
exit 1
