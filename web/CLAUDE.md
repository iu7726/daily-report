@AGENTS.md

# web

보고서 사이트. 루트 `CLAUDE.md`와 `.claude/feature/2026-11-02_report-site/plan.md`를 따른다.

- 명령: `npm run dev`, `npm run build`, `npm run lint`, `npm test`
- 보고서는 `../reports`에서 읽는다. 다른 위치를 쓰려면 `REPORTS_DIR` 환경 변수를 준다.
- 모든 페이지는 빌드 시점 정적 생성이다. 요청 시점 API(`cookies()`, `headers()` 등)를 쓰지 않는다.
- 보고서 본문은 AI가 쓴 글이다. 원시 HTML을 렌더링하지 않는다(`rehype-raw` 금지).
- 날짜는 `YYYY-MM-DD` 문자열로 다룬다. `new Date('YYYY-MM-DD')`를 쓰지 않는다(`lib/date.ts` 사용).
