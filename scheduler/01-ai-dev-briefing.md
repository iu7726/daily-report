# AI·개발 도구 브리핑

- 작업 ID: `ai-dev-briefing`
- 유형: 보고서형
- 일정: 매일 08:42 KST (Cron `42 8 * * *`)

## 실행 프롬프트

첫 줄은 `[YYYY-MM-DD AI·개발 도구 브리핑]`으로 작성해. 날짜는 실행일의 KST 날짜야.

직전 24시간 동안 나온 다음 분야의 소식을 조사해.

- OpenAI / GPT / Codex
- Google Gemini
- Anthropic Claude / Claude Code
- Agent Skills 및 MCP 생태계
- 그 밖의 AI 에이전트 및 개발 도구

공식 블로그, 공식 계정, 릴리스 노트, GitHub 릴리스·체인지로그를 우선 검색해 소식을 모아. 중요한 3~6건은 '소식'에, 의존성 갱신처럼 할 일이 거의 없는 것은 '짧은 소식'에 써.
Node.js, NestJS, TypeScript 백엔드 개발에 영향을 주는 소식을 우선해.

보고서 구성:

1. **한눈에 보기**: '소식' 절의 항목마다 한 행인 표 `| 소식 | 할 일 |`. 소식 칸은 "제품 버전 — 바뀐 것", 할 일 칸은 독자가 할 일을 짧게 써(예: "부팅·e2e 테스트 후 올리기", "급하지 않음"). 새 소식이 없으면 표 대신 "직전 24시간 동안 확인된 주요 신규 소식이 없습니다." 한 줄을 써. 휴일처럼 그날 사정이 있으면 표 아래 한 줄로 적어도 돼.
2. **소식**: 항목마다 아래 순서로 써.
   - 제목: `### 제품 버전 — 바뀐 것`
   - 무엇이 바뀌었는지 2~3문장. 발표·게시 시각은 쓰지 마.
   - 바뀐 동작이 여러 개면 표 하나(6행 이내). 호환성을 깨거나 동작이 바뀌는 것 위주로 고르고, 나머지는 원문 링크에 맡겨.
   - 인용 블록(`>`) 한두 문장: Node.js·NestJS·TypeScript 백엔드에서 달라지는 점이나 할 일. "적용점" 같은 라벨은 붙이지 마.
   - 원문 줄: `- 발표: YYYY-MM-DD · [원문](URL)`
3. **짧은 소식**: 한 줄씩 `- 제품 버전 — 한 문장 · [원문](URL) (YYYY-MM-DD)`. 없으면 이 절을 빼.
4. **주목할 Agent Skills**: 직전 24시간 제한 없이, skills.sh 트렌딩·설치 수 등에서 지금 관심이 몰리는 스킬 1~3개를 골라. 항목마다 아래 순서로 써.
   - 제목: ``### `스킬 이름` (저장소)``
   - 하는 일 2~3문장
   - 값 표 `| 설치 수 | 처음 등록 | 보안 감사 |`. 설치 수는 출처에 표시된 값 그대로 쓰고 확인 날짜를 붙여. 처음 등록이 오래됐으면 "신규 아님"으로 밝혀. 보안 감사 결과를 찾지 못하면 "확인 불가".
   - 인용 블록: Node.js·NestJS·TypeScript 백엔드 작업에서 쓸 만한지, 주의할 점(권한, 실행 범위)
   - 설치 명령(원문에 있는 그대로)과 원문 링크
   - 이전 보고서에서 소개한 스킬은 설치 수나 내용이 크게 바뀐 경우에만 다시 다뤄. 스킬은 조사만 하고 직접 설치하지 마.
5. **조사 기록**: 확인 기간, 새 소식이 없던 출처와 지금 버전, 원문에 맡기고 덜어 낸 변경, 스킬 후보에서 뺀 이유.

새 소식이 없어도 주목할 Agent Skills와 조사 기록은 써.

오래된 뉴스를 신규 소식으로 재포장하지 마.

### 우선 참조 출처

| 분야 | 출처 |
|---|---|
| GPT / Codex | [OpenAI 뉴스](https://openai.com/news/), [OpenAI API 변경 이력](https://developers.openai.com/api/docs/changelog), [Codex 릴리스](https://github.com/openai/codex/releases) |
| Gemini / Google AI | [Google DeepMind 블로그](https://deepmind.google/blog/), [Gemini API 변경 이력](https://ai.google.dev/gemini-api/docs/changelog), [Gemini CLI 릴리스](https://github.com/google-gemini/gemini-cli/releases) |
| Claude / Claude Code | [Anthropic 뉴스](https://www.anthropic.com/news), [Claude Platform 릴리스 노트](https://platform.claude.com/docs/en/release-notes/overview), [Claude Code 변경 이력](https://github.com/anthropics/claude-code/blob/main/CHANGELOG.md) |
| Agent Skills | [skills.sh](https://skills.sh/) (트렌딩·설치 수), [Anthropic Skills](https://github.com/anthropics/skills), [Vercel Agent Skills](https://github.com/vercel-labs/agent-skills) |
| MCP | [MCP 블로그](https://blog.modelcontextprotocol.io/), [MCP TypeScript SDK 릴리스](https://github.com/modelcontextprotocol/typescript-sdk/releases) |
| 업계·커뮤니티 (보조) | Reuters, The Verge, TechCrunch, Hacker News. 1차 자료로 확인되지 않으면 "미확인 보도"로 분리해. |
