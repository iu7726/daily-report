---
title: "AI·개발 도구 브리핑"
task: ai-dev-briefing
date: 2026-11-27
generated_at: 2026-11-27T08:50:00+09:00
level: urgent
summary: "NestJS 12.6.3은 패치 버전이지만 라우트 충돌 판정과 @Body('key') 동작이 바뀌었습니다. 올리기 전에 부팅·e2e 테스트를 돌려야 합니다."
headline: "NestJS 12.6.3 라우트 충돌 판정 변경, Qwen Code 0.28.7"
description: "라우트 충돌 판정을 바꾼 NestJS 12.6.3, 세션 vault 갱신을 넣은 openai 7.65.0, 반복 감지를 없앤 Qwen Code 0.28.7을 정리하고 Postgres 규칙 스킬을 골랐습니다."
tags: ["NestJS", "Fastify", "OpenAI Node SDK", "Qwen Code", "Vercel AI SDK", "PostgreSQL", "Agent Skills"]
---
[2026-11-27 AI·개발 도구 브리핑]
기준 시각: 2026-11-27 08:50 KST

## 한눈에 보기

| 소식 | 할 일 |
|---|---|
| NestJS 12.6.3 — 라우트 충돌 판정, `@Body('key')` 동작 변경 | 부팅·e2e 테스트 후 올리기 |
| `openai` 7.65.0 — 지출 한도 알림, 세션 vault 갱신 | 세션 vault 갱신 코드만 확인 |
| Qwen Code 0.28.6·0.28.7 — 반복 감지·도구 호출 상한 제거 | CI에서 쓴다면 시간·비용 상한 두기 |

미국 추수감사절이라 Anthropic, OpenAI, Google의 공식 발표는 없었습니다.

## 소식

### NestJS 12.6.3 — 라우트 충돌 판정과 `@Body('key')` 동작 변경

12.6.1·12.6.2에 이어 나온 패치지만, 이번 릴리스 노트에는 "동작 변경" 절이 따로 있습니다. 이제 라우터가 실제로 경로를 맞추는 방식대로 충돌을 검사해서, Express와 `caseSensitive: false`인 Fastify에서는 `GET /users`와 `GET /Users`를 같은 라우트로 봅니다. `duplicate: 'error'`를 켰다면 부팅이 멈춥니다.

| 영역 | 바뀐 동작 |
|---|---|
| `@Body('key')` | 본문이 `""`, `0`, `false`면 본문 전체 대신 `undefined`를 받음 |
| 버전 없는 제외 경로 | `MiddlewareConsumer.exclude()`와 `enableCsrfProtection()`의 `exclude`가 기본 버전 라우트에도 적용 |
| `ParseDatePipe` | 월말을 넘는 날짜(`2/30` 등) 거부 |
| 보안 헤더 | `referrerPolicy.policy`에 `undefined` 항목이 있으면 거부 |
| Fastify | 본문 전송 중 클라이언트가 끊으면 400 응답 |
| WebSocket | `events`와 `/events/`처럼 표기만 다른 게이트웨이가 한 서버를 공유 |

> 올리기 전에 앱을 한 번 띄워 대소문자만 다른 라우트가 없는지 봐야 합니다. 버전 없이 지정한 미들웨어·CSRF 제외 경로가 있다면 인증이 빠지는 라우트가 없는지 e2e 테스트로 확인해야 합니다.

- 발표: 2026-11-26 · [v12.6.3 릴리스](https://github.com/nestjs/nest/releases/tag/v12.6.3)

### `openai` 7.65.0 — 지출 한도 알림과 세션 vault 갱신

조직·프로젝트 지출 한도에 이메일 알림을 걸 수 있게 됐고, 대화 생성과 응답 압축 요청에 safety identifier를 넣을 수 있습니다. Managed Agents 세션 갱신에는 `vault_ids`가 생겼습니다. 값을 주면 vault 참조를 통째로 바꾸고, `null`이나 빈 배열을 주면 모두 지웁니다.

> 세션 vault를 일부만 바꾸려면 기존 목록을 읽어 합친 뒤 넘겨야 합니다. 빈 배열을 넘기면 연결이 모두 끊깁니다. Responses 호출만 쓴다면 급하지 않습니다.

- 발표: 2026-11-26 · [openai-node CHANGELOG](https://github.com/openai/openai-node/blob/master/CHANGELOG.md)

### Qwen Code 0.28.6·0.28.7 — 반복 감지와 도구 호출 상한 제거

0.28.7부터는 모델이 같은 도구 호출을 반복해도 CLI가 끊지 않고, 도구 결과와 오류를 가공 없이 모델에 넘깁니다. 앞서 나온 0.28.6은 ACP 답변을 다시 쓰던 별도 모델 호출을 없애고 훅으로 바꿨습니다. 둘 다 호환성을 깨는 변경입니다.

> CI나 헤드리스 모드로 돌린다면 작업 시간 제한이나 비용 상한을 파이프라인 쪽에 두고 올려야 합니다.

- 발표: 0.28.6 2026-11-26 · 0.28.7 2026-11-27 · [Qwen Code 릴리스](https://github.com/QwenLM/qwen-code/releases)

## 짧은 소식

- Vercel AI SDK `ai` 7.0.183 — `@ai-sdk/provider-utils`와 `@ai-sdk/gateway` 버전만 올렸고, 6.x와 5.x도 같은 날 패치가 나왔습니다. · [ai CHANGELOG](https://github.com/vercel/ai/blob/main/packages/ai/CHANGELOG.md) (2026-11-26)

## 주목할 Agent Skills

### `supabase-postgres-best-practices` (supabase/agent-skills)

Supabase가 관리하는 Postgres 작업 규칙 모음입니다. Supabase 전용이 아니라 어느 Postgres에나 맞고, 마이그레이션·인덱스·RLS·느린 쿼리 진단처럼 DB를 건드리기 전에 불러오도록 만들어졌습니다. 규칙마다 잘못된 SQL과 바른 SQL, EXPLAIN 결과를 함께 보여 줍니다.

| 설치 수 | 처음 등록 | 보안 감사 |
|---|---|---|
| 499.7K (11-27 확인) | 2026-01-21, 신규 아님 | Gen Agent Trust Hub·Socket·Snyk 모두 Pass |

> TypeORM이나 Prisma로 PostgreSQL을 쓰는 NestJS 서비스에서 마이그레이션과 인덱스를 에이전트에게 맡길 때 기준으로 쓰기 좋습니다. 실행 스크립트 없이 문서뿐이라 권한 부담도 작습니다. RLS·`pg_cron`처럼 Supabase 환경을 전제로 한 규칙은 걸러서 쓰면 됩니다.

- 설치: `npx skills add https://github.com/supabase/agent-skills --skill supabase-postgres-best-practices`
- 원문: [skills.sh](https://skills.sh/supabase/agent-skills/supabase-postgres-best-practices) · [SKILL.md](https://github.com/supabase/agent-skills/blob/main/skills/supabase-postgres-best-practices/SKILL.md)

## 조사 기록

- 확인 기간: 2026-11-26 08:42 ~ 11-27 08:42 KST
- 새 소식 없음: Anthropic 뉴스(11월 20일 이후), Claude Platform 릴리스 노트(11월 23일 이후, Sonnet 4.5 종료일 11월 30일 그대로), Claude Code 2.1.332, `@anthropic-ai/sdk` 1.14.0, OpenAI 뉴스·API 변경 이력(11월 24일 이후), Codex CLI 0.172.0(알파판만 게시), Copilot CLI 1.0.116(사전 배포판만 게시), GitHub 변경 이력(11월 25일 이후), Gemini API·Gemini CLI 0.71.1(11월 19일 이후), MCP 블로그(11월 24일 이후)와 SDK, TypeScript 7.0.2, `langchain` 1.6.8, `skills` 1.9.0
- 덜어 낸 변경: NestJS의 `GrpcExceptionFilter` 로그, 404 성능 개선, 테스트 `instrument` 옵션, Qwen Code의 백그라운드 셸·모델별 설정 저장 등은 원문에 있습니다.
- 스킬 후보: skills.sh 상위권은 영상·디자인 스킬과 이미 소개한 `agent-browser`, `find-skills`, mattpocock/skills입니다.
