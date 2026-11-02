# AI·개발 도구 브리핑

- 작업 ID: `ai-dev-briefing`
- 유형: 보고서형
- 일정: 매일 08:30 KST (Cron `30 8 * * *`)

## 실행 프롬프트

첫 줄은 `[YYYY-MM-DD AI·개발 도구 브리핑]`으로 작성해. 날짜는 실행일의 KST 날짜야.

직전 24시간 동안 나온 다음 분야의 소식을 조사해.

- OpenAI / GPT / Codex
- Google Gemini
- Anthropic Claude / Claude Code
- Agent Skills 및 MCP 생태계
- 그 밖의 AI 에이전트 및 개발 도구

공식 블로그, 공식 계정, 릴리스 노트, GitHub 릴리스·체인지로그를 우선 검색해 핵심 소식 5~8건을 정리해.
Node.js, NestJS, TypeScript 백엔드 개발에 영향을 주는 소식을 우선해.

보고서 구성:

1. **오늘의 요약**: 3줄 이내로 쓰고, 바로 확인하거나 적용해 볼 것이 있으면 함께 적어.
2. **주요 소식**: 항목마다 다음을 포함해.
   - 발표일
   - 핵심 변경 사항
   - 공식 원문 링크
   - 개발자에게 주는 의미
   - 실무 적용 포인트(Node.js·NestJS·TypeScript 백엔드 기준)
3. **주목할 Agent Skills**: 직전 24시간 제한 없이, skills.sh 트렌딩·설치 수 등에서 지금 관심이 몰리는 스킬 1~3개를 골라. 항목마다 다음을 포함해.
   - 스킬 이름과 원문 링크
   - 설치 수와 확인 시각(출처에 표시된 값 그대로)
   - 처음 등록된 시기. 오래된 스킬이면 "신규 아님"으로 밝혀.
   - 하는 일 한두 줄
   - 설치 명령(원문에 있는 그대로)
   - 실무 평가: Node.js·NestJS·TypeScript 백엔드 작업에서 쓸 만한지, 주의할 점(권한, 실행 범위)
   - 이전 보고서에서 소개한 스킬은 설치 수나 내용이 크게 바뀐 경우에만 다시 다뤄. 스킬은 조사만 하고 직접 설치하지 마.
4. 새 소식이 없으면 "직전 24시간 내 확인된 주요 신규 소식 없음"이라고 밝힌 짧은 브리핑을 작성해. 주목할 Agent Skills 항목은 새 소식과 상관없이 작성해.

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
