# 보안 리포트 분야별 확대 — 기획서

> 상태: **구현·검증 완료 (2026-11-03)**. 배포 `v0.0.10`, 수정분은 루틴 파일만 바뀌어 태그 없음.
> 남은 것: 없음. 11-04 정기 실행(08:25 시작, 08:30 커밋, 13KB)에서 분야 절 5개를 포함한 11개 절, 한눈에 보기 표, KEV 표, 확인 명령이 모두 나왔고 조회 실패 목록이 없었다.
>
> 구현 변경점 (계획 대비, 1차 시험 실행 후):
> - 클라우드 루틴 세션에서 `api.github.com`이 막혀 있다("sessions are bound to their configured repositories"). 루틴은 스스로 OSV 미러로 우회했다. 조사 절차를 처음부터 OSV(`osv-vulnerabilities.storage.googleapis.com/<생태계>/modified_id.csv` + `api.osv.dev/v1/vulns/<ID>`)로 바꿨다. npm·GitHub Actions 둘 다 로컬에서 받아 확인했다.
> - 다시 쓴 리포트에서 아침 버전의 P1(Cursor 마켓플레이스 Claude Code 확장 변조, 10-29 사건)이 빠졌다. 같은 날 파일을 읽지 않는 규칙과, 목록 밖 사건 찾기를 웹 검색 두 번으로 끝낸 것이 원인이다. 그래서 (1) 같은 날 다시 실행하면 기존 파일의 소제목·태그를 확인 대상 목록으로만 쓰고, (2) 목록 밖 사건 찾기에서 AI 코딩 도구 공식 채널과 공급망 보안 업체 블로그를 직접 열도록 했다. 아침 버전은 git 기록(`2d2173f`)에 있다.
> - "AI·에이전트" 분야를 "AI·개발 도구"로 넓혀 VS Code, 확장 마켓플레이스(VS Code Marketplace, Open VSX)를 핵심에, JetBrains IDE를 추가에 넣었다(사용자 2026-11-03: "IDE 쪽이 빠졌다"). Cursor 확장 변조처럼 마켓플레이스 사고는 공식 취약점 목록에 안 올라와서, 목록 밖 사건 찾기에 마켓플레이스 공지를 넣었다.
> - 루틴이 받은 저장소에 강제 푸시 전의 옛 `main`이 남아 있었다(로컬과 원격이 13 / 77 커밋 갈라짐). 루틴은 스스로 원격에 맞췄지만, 공통 규칙 '결과 저장'에 0단계(`git checkout -B main origin/main`)를 넣었다.

## 0. TL;DR

같은 날(11-03) ChatGPT 리포트와 비교해 보니, ChatGPT는 공식 목록을 **날짜로 훑어** 신규 공지를 빠짐없이 가져왔다(AWS 공지 4건, GitHub 보안 DB에 등록된 npm 권고 2건, MCP 위장 악성 패키지). Claude 루틴은 큰 사건 위주로 3~4건을 골라 깊게 쓰고 대상 밖은 걸러서, 목록에만 올라온 신규 권고가 빠졌다(대신 Cursor 확장 변조처럼 목록에 없는 사건은 Claude만 잡았다).

그래서 두 가지를 같이 바꾼다. (1) 조사를 "공식 목록 날짜 훑기 → 분야 분류 → 목록에 없는 사건 보강" 순서로 정한다. (2) 보안 리포트를 다섯 분야(클라우드(AWS) / AI·에이전트 / 런타임·프레임워크 / 데이터베이스 / 공급망·CI/CD·인프라)로 나눠 점검하고, 본문도 분야별 절로 쓴다. 점검 대상을 늘리되 항목 하나의 설명 깊이는 지금과 같다. P3는 한 줄로 줄여 길이가 지나치게 늘지 않게 한다.

## 1. 범위

- `scheduler/03-security-daily-report.md`의 점검 대상, 보고서 구성, 우선 참조 출처
- 사이트·README의 보안 리포트 소개 문구
- 보안 점검 스킬 안내에 새로 다룰 npm 패키지 예시 추가
- 우선순위 기준(P1/P2/P3), level 기준, 후속 확인 등록은 그대로

## 2. 현재 (2026-11-03)

- 핵심 9개(Node.js, TypeScript, PostgreSQL, Redis, AWS 6개 서비스, React, Next.js, Claude Code, OpenAI Codex) + 추가 6개
- 본문: 긴급 조치 요약 → 핵심 이슈 3~7건 → 기술 스택별 상태표(핵심 9행) → 미확인 보도
- AI는 코딩 도구 2개뿐이라 11-03 Cursor 확장 변조 같은 사건은 "점검 대상 밖"으로 분류됐다.
- 실행 시간 약 5분, 보고서 13~18KB

## 3. 결정 사항

### 확정 (사용자 2026-11-03)

- **D1. 분야별로 넓힌다.** 항목 설명 깊이는 지금과 같다.
- **D2. 언어·런타임은 Node.js·TypeScript만.** Python, Java, Go는 넣지 않는다.
- **D3. AI 범위 = AI 코딩 도구 + MCP·Agent Skills + AI 앱 SDK.** LLM 서비스 사고(데이터 유출, 모델 공급망)는 넣지 않는다.

### 구현 방향

- **D4. 분야와 대상**: 핵심은 매일 확인하고 절 끝에 이름을 남긴다. 추가는 이슈가 있을 때만 다룬다.

  | 분야 | 핵심 | 추가 |
  |---|---|---|
  | 클라우드 (AWS) | AWS Security Bulletins 전체, IAM, EC2, S3, CloudFront, ALB, ECR, ECS·EKS, Lambda, RDS·Aurora, ElastiCache, Cognito, Secrets Manager·KMS | API Gateway, SQS·SNS, AWS SDK for JavaScript |
  | AI·에이전트 | Claude Code, OpenAI Codex, Cursor, GitHub Copilot, Gemini CLI, MCP 공식 SDK, Vercel AI SDK, LangChain.js, OpenAI·Anthropic SDK | 많이 쓰는 MCP 서버, 악성 MCP 서버·스킬·확장 유포, LlamaIndex.TS |
  | 런타임·프레임워크 | Node.js(undici 포함), TypeScript, React, Next.js, NestJS | Express, Fastify |
  | 데이터베이스 | PostgreSQL, MySQL·MariaDB, MongoDB, Redis(Valkey 포함) | Elasticsearch·OpenSearch, 벡터 DB(pgvector, Qdrant 등), ORM·드라이버(Prisma, TypeORM, pg, mysql2, ioredis, mongoose) |
  | 공급망·CI/CD·인프라 | npm 생태계 공급망, GitHub Actions, GitLab, Docker | Nginx, OpenSSL, OpenSSH, Kubernetes |

- **D5. 본문 구성**: 긴급 조치 요약 → 한눈에 보기(분야 5행 표) → 분야별 절 5개 → 미확인 보도·루머.
  - 분야 절: P1·P2는 지금 항목 형식(요약 → 값 표 → 조치 → 원문), P3는 "참고" 아래 한 줄, 절 끝에 "이상 없음으로 확인한 대상: …"
  - 기술별 상태표(핵심 9행)는 없애고, 한눈에 보기 표와 절마다의 확인 대상 줄로 대신한다. 대상이 30개 가까이 되어 한 표에 다 넣으면 휴대폰에서 읽기 어렵다.
  - 항목 번호(①②③)는 보고서 전체에서 이어 매기고, 긴급 조치 요약과 한눈에 보기 표가 이 번호로 가리킨다.
  - 목표 건수: P1·P2 항목과 P3 한 줄을 합쳐 5~12건. 없으면 채우지 않는다.
  - 분야 절이 `##` 제목이라 사이트 목차에 분야가 그대로 나온다.
- **D6. 출처**: 분야별 우선 참조 출처 표. 보안 업체 블로그(Socket, Snyk, StepSecurity, Wiz 등)는 공급망 사건의 보조 출처로만 쓰고, 1차 자료로 확인되지 않으면 미확인 보도로 분리한다.
- **D8. 목록 날짜 훑기(조사 절차)**: 2026-11-03에 로컬에서 직접 받아 확인한 목록이다.
  - AWS Security Bulletins RSS(`/security/security-bulletins/rss/feed/`): 38건, `pubDate` 있음, 날짜순 아님
  - GitHub 보안 DB API(`/advisories?ecosystem=npm&type=reviewed|malware&published=A..B`): 11-02~03 권고 2건(DBHub, SD-JWT), 악성 60건. 인증 없이 시간당 60회
  - CISA KEV JSON(cisa.gov, GitHub 미러): 1,766건, `catalogVersion` 2026.10.30, `dateAdded` 있음
  - 악성 패키지는 하루 수십 건이라 건수만 적고, AI·MCP나 점검 대상 생태계를 사칭하는 것만 다룬다. 목록 조회 실패는 "이슈 없음"이 아니라 실패로 적는다.
  - 분야는 공지를 낸 곳이 아니라 영향받는 소프트웨어 기준(AWS가 낸 MCP 서버 공지 → AI·에이전트).
  - 공개일과 DB 등록일이 다르면 둘 다 적는다.
- **D9. 영향 범위 판단 한 줄**: 항목마다 누가 해당하고 누가 해당하지 않는지(예: "일반 EC2·S3 사용 환경 전체가 아니라 이 도구를 쓰는 경우만").
- **D10. 새 절**: "KEV·최근 7일 미해결"(카탈로그 버전, 신규 등재, 조치 기간 중인 P1), "오늘 확인할 명령"(`npm ls --all …` 등 확인만 하는 명령). 목표 건수 5~15건.
- **D11. 공개 저장소**: ChatGPT 리포트는 개인 업무 맥락(검토 중인 사내 구조)과 연결해 썼지만, 이 리포트는 공개 사이트라 일반적인 Node.js·NestJS 백엔드 기준으로만 쓴다. 내 프로젝트에 대 보는 일은 로컬 보안 점검 스킬이 맡는다.
- **D7. 비용**: 실행 시간이 5분에서 10분 안팎으로 늘 것으로 본다. 첫 실행 후 실제 시간을 적는다.

## 5. 케이스

- C1. 한 사건이 두 분야에 걸침(예: Cursor 확장 변조 = AI + 공급망) → 더 직접적인 분야 한 곳에 쓰고, 다른 분야 절에는 "① 참고" 한 줄
- C2. 분야 전체에 이슈 없음 → "확인된 신규 주요 이슈 없음" + 확인한 대상 한 줄
- C3. AWS 공지가 서비스 측에서 이미 조치되어 사용자 할 일이 없음 → P3 한 줄, "사용자 조치 불필요"
- C4. 이전 보고에서 다룬 사건 → 새 변화가 있을 때만(공통 규칙). 아직 조치 기간인 P1은 긴급 조치 요약에 한 줄로 이어서 상기

## 7. 검증

- [ ] 작업 파일·README·사이트 문구 반영, 사이트 테스트·빌드 통과
- [x] 1차 시험 실행(2026-11-03 11:28 KST, 294초, 34턴): AWS RSS·KEV는 직접 조회, GitHub 보안 DB는 API 차단으로 OSV 미러 사용. 분야 절 5개, 한눈에 보기 표, 절마다 확인 대상 줄, KEV 절(카탈로그 2026.10.30), 확인 명령 절 모두 있음. "~습니다"체. 15KB
- [x] 같은 날 ChatGPT 리포트의 신규 공지가 모두 들어감: AWS 공지(5건, ChatGPT 4건 + QnABot 재게시), DBHub, SD-JWT, MCP 위장 악성 패키지(4종, ChatGPT 2종). 추가로 `persona-ai-sdk` 악성 패키지, GitLab 최신 패치 기준 정정(CVE-2026-110264), 악성 npm 31건 건수
- [x] 아침 버전의 Cursor 확장 변조(P1)가 빠짐 → 수정 후 2차 시험 실행(11:40 KST, 약 320초)에서 P1로 다시 들어옴. 영향 범위 판단("VS Code Microsoft 마켓플레이스·Claude Code CLI는 해당 없음")과 확인 명령까지 포함
- [x] 2차 실행: OSV(npm·GitHub Actions)·AWS RSS·KEV 조회 실패 없음. ChatGPT 리포트 항목 모두 포함, 추가로 Linux 커널 TCP RCE(CVE-2026-98432)의 RDS·Aurora OS 패치 제공(11-03), GitLab 최신 패치 기준, `pull_request_target` 기본 차단. level `urgent`, 20KB
