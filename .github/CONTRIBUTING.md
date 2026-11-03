# 기여 안내

이 저장소는 한 사람이 운영하는 개인 프로젝트입니다. 코드 기여보다 아래 두 가지가 가장 큰 도움이 됩니다.

## 보고서 오류 제보

보고서는 AI가 공개 자료를 바탕으로 매일 자동으로 씁니다. 틀린 버전이나 날짜, 바뀐 공지, 끊긴 링크를 발견하면 [보고서 정정 요청](https://github.com/iu7726/daily-report/issues/new?template=report-correction.yml)으로 알려 주세요. 공식 원문 링크를 함께 주시면 빨리 확인할 수 있습니다.

`reports/` 아래 보고서 파일을 직접 고치는 PR은 받지 않습니다. 보고서는 루틴이 쓴 기록이라, 정정은 이슈로 받아 확인한 뒤 반영합니다.

## 제안

다뤘으면 하는 분야나 출처, 사이트 기능이 있으면 [제안](https://github.com/iu7726/daily-report/issues/new?template=suggestion.yml)으로 남겨 주세요.

## 코드 기여

큰 변경은 PR을 보내기 전에 이슈로 먼저 이야기해 주세요.

- 브랜치: `dev`에서 새 브랜치를 만들고, PR도 `dev`로 보내 주세요.
- 커밋 메시지: `type: 한국어 설명` (type은 `feature`, `fix`, `refactor`, `docs`, `build`, `style`, `test`)
- 확인: `web/`을 바꿨다면 아래 명령이 통과해야 합니다.

  ```sh
  cd web
  npm test
  npx tsc --noEmit
  npm run lint
  ```

- 공개 저장소라 개인 정보나 계정·인증 값은 코드, 문서, 보고서 어디에도 넣지 마세요.

## 보안 문제

공개 이슈 대신 [보안 정책](SECURITY.md)에 적힌 비공개 신고를 이용해 주세요.

## 라이선스

보내 주신 코드는 MIT, 글은 CC BY 4.0으로 공개됩니다. 자세한 내용은 [README의 라이선스](../README.md#-라이선스)를 봐 주세요.
