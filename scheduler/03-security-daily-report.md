# IT 보안 이슈 데일리 리포트

- 작업 ID: `security-daily-report`
- 유형: 보고서형
- 일정: 매일 08:25 KST (Cron `25 8 * * *`)

## 실행 프롬프트

첫 줄은 `[YYYY-MM-DD IT 보안 이슈 리포트]`로 작성해. 날짜는 실행일의 KST 날짜야.

직전 24시간 동안 새로 공개됐거나 중대한 변화(실제 악용 확인, KEV 등재, 패치 배포 등)가 생긴 보안 이슈를 우선 조사해. 파급력이 큰 경우에는 최근 7일 동안 해결되지 않은 중요 이슈도 포함해.

### 조사 절차

큰 사건만 찾지 말고, 아래 공식 목록을 먼저 **날짜로 훑어** 조사 기간에 새로 올라온 것을 빠짐없이 모은 다음 분야별로 나눠.

목록과 공지 페이지는 `curl -sL --max-time 30 -w '%{http_code} %{size_download}\n'`로 직접 받아 날짜로 걸러. 리다이렉트를 따라가야 한다(`-L`, 예: `openssh.com` → `openssh.org`). 응답 코드가 200이 아니거나 본문이 안내 페이지 수준("Moved Permanently", "Forbidden" 같은 몇 KB짜리)이면 조회 실패다. 실패한 출처를 보고 "새 공지 없음"으로 판단하지 마.

1. **AWS Security Bulletins**: RSS `https://aws.amazon.com/security/security-bulletins/rss/feed/`. 항목이 날짜순이 아니니 `pubDate`로 걸러. 조사 기간에 올라온 공지는 모두 다뤄. 서비스 자체 공지뿐 아니라 AWS 오픈소스 도구·SDK·MCP 서버 공지도 포함이다.
2. **GitHub 보안 DB 권고 (npm, GitHub Actions)**: GitHub 보안 DB를 그대로 옮겨 오는 OSV 미러로 봐. 루틴 환경에서는 `api.github.com`이 막혀 있다(연결된 저장소 API만 허용).
   - 목록: `https://osv-vulnerabilities.storage.googleapis.com/npm/modified_id.csv`, `https://osv-vulnerabilities.storage.googleapis.com/GitHub%20Actions/modified_id.csv`. 한 줄이 `수정 시각(UTC),ID`이고 최근 수정순이다. 조사 기간에 수정된 ID만 골라.
   - 상세: `https://api.osv.dev/v1/vulns/<ID>`. `GHSA-`는 GitHub 검토 권고, `MAL-`은 악성 패키지다. `published`(또는 `database_specific.github_reviewed_at`)가 조사 기간이면 신규, 아니면 기존 권고의 변경이다. 변경은 심각도 상향, 수정 버전 추가, 실제 악용 확인처럼 중요한 것만 다뤄.
   - Claude Code(`@anthropic-ai/claude-code`), Codex(`@openai/codex`), Gemini CLI(`@google/gemini-cli`)는 npm 패키지라 권고가 여기에 올라온다.
   - 점검 대상 분야의 패키지이거나 널리 쓰이는 패키지(AI·MCP, 인증·토큰, DB, HTTP 관련)는 항목으로 다뤄. 나머지는 "그 밖의 npm 권고 N건"처럼 건수만 조사 기록에 적어.
3. **악성 패키지 (npm)**: 2번 목록의 `MAL-` 항목. 보통 하루 수십 건이라 다 쓰지 마. 전체 건수를 적고, AI·MCP 도구나 점검 대상 생태계(Next.js, NestJS, DB 드라이버, AWS SDK 등)를 사칭하는 것만 골라 다뤄. 비슷한 이름이 여러 개면 묶어서 한 항목으로 써.
4. **CISA KEV**: `https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json` (접속이 안 되면 `https://raw.githubusercontent.com/cisagov/kev-data/develop/known_exploited_vulnerabilities.json`). `catalogVersion`과 조사 기간에 추가된 항목(`dateAdded`)을 확인해. 점검 대상에 해당하면 P1 항목으로 다루고, 해당하지 않는 신규 등재는 조사 기록에 한 줄씩 적어.
5. **NVD 신규 CVE (서버·DB·인프라)**: OpenSSH, OpenSSL, nginx, PostgreSQL, MySQL·MariaDB, MongoDB, Redis·Valkey, Docker, Kubernetes, GitLab, Git, Elasticsearch·OpenSearch 같은 npm 밖 제품은 1 ~ 4번 목록에 안 올라온다. 저장소 루트에서 아래 스크립트로 직전 **48시간**에 NVD에 공개된 CVE를 받아 걸러.

   ```bash
   python3 -I scheduler/scripts/nvd_scan.py --hours 48
   ```

   - '대상 제품'으로 나온 CVE 중 이전 보고서 2개에 없는 것은 신규로 다뤄. 48시간으로 잡은 것은 전날 놓친 것을 다음 날 잡으려는 것이다. 공개일은 NVD 공개 시각 그대로 적어.
   - 영향 제품이 "확인 불가"인 것은 설명을 읽고 대상 제품 자체의 취약점인지 판단해. '설명에 이름만 나온 다른 제품'은 훑어보기만 하고, 대상 제품 자체의 취약점이 섞여 있으면 다뤄.
   - 우선순위는 아래 '우선순위 기준'대로 정해. 벤더 공지가 있으면 그것을 원문으로, 없으면 NVD 링크를 원문으로 써.
   - 대상 제품이 20건을 넘으면 P1·P2만 항목으로 쓰고 나머지는 "그 밖의 NVD 신규 N건"으로 묶어 조사 기록에 적어.
   - 종료 코드가 2면 조회 실패다. 조사 기록에 "NVD 조회 실패"를 적어.
6. **서버·DB·인프라 벤더 공지**: 아래 페이지의 맨 위 항목 날짜를 봐. CVE보다 릴리스가 먼저 나오는 경우가 많다(OpenSSH 10.6p2는 릴리스가 CVE 공개보다 6시간쯤 빨랐다).

   | 제품 | 주소 | 볼 것 |
   |---|---|---|
   | OpenSSH | `https://www.openssh.com/releasenotes.html` | 맨 위 릴리스 날짜와 그 릴리스의 "Security" 절. `security.html`은 늦게 갱신되니 보지 마 |
   | OpenSSL | `https://openssl-library.org/news/vulnerabilities/` | 맨 위 항목 날짜 |
   | nginx | `https://nginx.org/en/security_advisories.html`, `https://nginx.org/` | 보안 권고와 첫 화면 소식 날짜 |
   | PostgreSQL | `https://www.postgresql.org/support/security/` | 맨 위 항목 날짜 |
   | Docker | `https://docs.docker.com/security/security-announcements/` | 맨 위 공지 날짜 |
   | Redis·Valkey | `https://github.com/redis/redis/security/advisories`, `https://github.com/valkey-io/valkey/security/advisories` (WebFetch) | 최근 권고 날짜 |

7. **목록에 없는 사건 찾기.** 공급망 공격(확장·패키지 변조, CI 토큰 탈취), 예고된 보안 릴리스, 개발 도구 자체의 사고는 위 목록보다 먼저 나오거나 아예 안 올라온다. 웹 검색만으로 끝내지 말고 아래를 직접 열어 봐(WebFetch). `github.com` 페이지는 WebFetch로 열린다.
   - AI 코딩 도구·IDE 공식 채널: Claude Code 변경 이력, Cursor 변경 이력·보안 공지(포럼 공지 포함), OpenAI Codex 릴리스, GitHub Changelog(Copilot), Gemini CLI 릴리스, VS Code 릴리스 노트
   - 확장 마켓플레이스 사고: VS Code Marketplace·Open VSX의 악성·변조 확장(Open VSX·Eclipse Foundation 공지, Microsoft 공지). Cursor 같은 VS Code 계열 편집기는 Open VSX를 쓴다.
   - 공급망 보안 업체의 최근 글 목록: StepSecurity, Socket, Aikido, Wiz 블로그. 1차 자료(벤더 공지, 저장소 권고)로 확인되면 다루고, 아니면 "미확인 보도"로 분리해.
   - 그 밖의 분야별 공식 출처('우선 참조 출처')
   - 최근 7일 안에 일어났고 아직 조치가 필요한 P1급 사건은 이전 보고서에 없었다면 신규로 다뤄.
8. **Hacker News 대조**: 위에서 다 모은 뒤, 개발자 사이에서 화제가 된 사건을 놓치지 않았는지 대조해.

   ```bash
   python3 -I scheduler/scripts/hn_top.py --hours 24 --points 100
   ```

   - `[보안]` 표시 글만 보지 말고 제목을 모두 훑어. 취약점에 별명을 붙인 제목(예: "sshole")은 단어로 못 잡는다.
   - 점검 대상에 닿는데 위에서 못 찾은 사건이 있으면 1차 자료(벤더 공지, 보안 권고, NVD)를 찾아 확인하고 다뤄. Hacker News 글 자체는 출처로 쓰지 마. 1차 자료로 확인되지 않으면 '미확인 보도'에 적어.
   - 종료 코드가 2면 건너뛰고 조사 기록에 적어.

목록 조회에 실패하면 그 사실을 조사 기록에 적어. 실패를 "이슈 없음"으로 쓰지 마.

공개일과 DB 등록일이 다르면 둘 다 적어(예: "최초 공개 2026-06-24 · GitHub DB 등록 2026-11-02"). 공개는 오래됐어도 조사 기간에 DB에 처음 올라온 권고는 신규로 다뤄.

분야는 **영향받는 소프트웨어** 기준으로 나눠. 예를 들어 AWS가 낸 공지라도 MCP 서버에 관한 것이면 AI·개발 도구에 넣어.

### 점검 대상

다섯 분야로 나눠 점검해. **핵심**은 매일 반드시 확인하고, 신규 이슈가 없으면 조사 기록의 "이상 없음으로 확인한 대상"에 이름을 남겨. **추가**는 이슈가 있을 때만 다뤄.

| 분야 | 핵심 | 추가 |
|---|---|---|
| 클라우드 (AWS) | AWS Security Bulletins 전체, IAM, EC2, S3, CloudFront, ALB, ECR, ECS·EKS, Lambda, RDS·Aurora, ElastiCache, Cognito, Secrets Manager·KMS | API Gateway, SQS·SNS, AWS SDK for JavaScript |
| AI·개발 도구 | Claude Code, OpenAI Codex, Cursor, GitHub Copilot, Gemini CLI, VS Code, 확장 마켓플레이스(VS Code Marketplace, Open VSX), MCP 공식 SDK, Vercel AI SDK, LangChain.js, OpenAI·Anthropic SDK | JetBrains IDE, 많이 쓰는 MCP 서버, 악성 MCP 서버·스킬 유포, LlamaIndex.TS |
| 런타임·프레임워크 | Node.js(undici 포함), TypeScript, React, Next.js, NestJS | Express, Fastify |
| 데이터베이스 | PostgreSQL, MySQL·MariaDB, MongoDB, Redis(Valkey 포함) | Elasticsearch·OpenSearch, 벡터 DB(pgvector, Qdrant 등), ORM·드라이버(Prisma, TypeORM, pg, mysql2, ioredis, mongoose) |
| 공급망·CI/CD·인프라 | npm 생태계 공급망, GitHub Actions, GitLab, Docker | Nginx, OpenSSL, OpenSSH, Kubernetes, Git |

언어는 Node.js·TypeScript만 본다. AI 서비스 자체의 데이터 유출이나 모델 공급망 사건은 우리 코드·개발 환경에 직접 닿는 경우(예: 쓰고 있는 SDK의 취약점)가 아니면 다루지 않는다.

### 우선순위 기준

- **P1 (즉시 조치)**: 실제 악용이 확인됐거나, CISA KEV에 등재됐거나, 인증 없이 원격 코드 실행이 가능한 경우 등
- **P2 (이번 주 내 조치)**: CVSS 7.0 이상이거나 널리 쓰이는 기본 구성에 영향을 주는 경우
- **P3 (참고)**: 영향 범위가 제한적이거나 특정 조건에서만 발생하는 경우

### 보고서 구성

P1·P2 항목과 P3 한 줄을 합쳐 5~15건이 목표야. 해당 소식이 적으면 채우지 마. 항목 번호(①②③…)는 '주요 항목'부터 '참고'까지 이어서 매기고, '오늘 할 일'과 '한눈에 보기'는 이 번호로 항목을 가리켜. 결론은 frontmatter `summary`에만 쓰고, 본문은 '오늘 할 일'로 바로 시작해.

1. **오늘 할 일**: 독자가 오늘 할 일을 한 줄씩 써. 순서는 P1, 긴급 감시·후속 확인으로 알린 사건, P2, 기한이 다가온 이전 P1이야. 줄마다 항목 번호를 붙이고 "~해야 합니다"나 "~하면 됩니다"로 끝내. 할 일이 없으면 "오늘 바로 할 일은 없습니다." 한 줄만 써.
2. **한눈에 보기**: 분야마다 한 행인 표. 상태는 그 분야에서 가장 높은 우선순위(P1/P2/P3)이고, 이슈가 없으면 "이상 없음"이야. 항목 칸에는 번호와 이름만 써.

   | 분야 | 상태 | 항목 |
   |---|---|---|
   | 클라우드 (AWS) | 이상 없음 | - |
   | AI·개발 도구 | P1 | ① 제품 |
   | 런타임·프레임워크 | P2 | ② 제품, ③ 제품 |
   | 데이터베이스 | P3 | ④ 제품 |
   | 공급망·CI/CD·인프라 | 이상 없음 | - |

3. **주요 항목**: P1·P2를 우선순위 순으로 아래 '항목 형식'대로 써. 분야별로 나누지 않아. 없으면 이 절을 빼.
4. **참고**: P3를 한 줄 목록으로 써. `- ⑤ 제품과 버전 — 무엇이 문제이고 누가 해당하는지 1~2문장 · [원문](URL)`. 수정 버전이 있으면 문장에 넣어. 없으면 이 절을 빼.
   - 한 사건이 두 분야에 걸치면 한 번만 쓰고, '한눈에 보기'에는 더 직접적인 분야에 넣어.
   - AWS 공지처럼 서비스 쪽에서 이미 조치되어 독자가 할 일이 없으면 P3로 쓰고 "따로 할 일은 없습니다"처럼 밝혀.
5. **아직 조치 기간인 P1**: 최근 7일 안에 다룬 P1 중 아직 조치 기간인 것을 표로 써. `| 식별번호 | 대상 (보고일) | 해야 할 일 |`. 해야 할 일 칸에는 수정 버전을 그대로 적어. 없으면 이 절을 빼.
6. **오늘 확인할 명령**: 오늘 다룬 항목이 내 환경에 해당하는지 **확인만 하는** 명령을 모아. 설치·수정·삭제하는 명령은 쓰지 마.
   - npm 패키지는 `npm ls --all <패키지…>`로 한데 묶고, 수정 버전을 옆에 적어.
   - `npx`로 실행하는 MCP 서버처럼 lockfile에 안 남는 것은 어디를 봐야 하는지(MCP 설정 파일, CI 설치 로그) 함께 적어.
   - 런타임·이미지 버전 확인(`node -v`, `docker image ls` 등)은 그날 항목과 관련 있을 때만.
7. **미확인 보도**: 사실 확인이 안 된 내용을 한 줄 목록(1~3문장)으로 써. 없으면 이 절을 빼.
8. **조사 기록**: 마지막 절. 아래를 짧은 목록으로 모아.
   - 조사 범위와 목록 조회 결과(실패한 목록과 출처)
   - 이상 없음으로 확인한 대상: 분야마다 한 줄. 그 대상의 출처(벤더 공지나 1 ~ 4번 목록)를 실제로 받아 확인했고, NVD 스캔(5번) 대상 제품이면 NVD 스캔까지 성공했을 때만 넣어.
   - 확인 실패: `<대상> (<출처>)`. 조회에 실패했거나 확인하지 못한 대상이야.
   - 새 버전·새 공지가 없던 출처와 지금 버전
   - KEV `catalogVersion`과 점검 대상 밖 신규 등재, "그 밖의 npm 권고 N건"·"그 밖의 NVD 신규 N건" 같은 건수
   - Hacker News 대조 결과
   - 후속 확인: 새로 올린 항목, 열린 항목과 상태

### 긴급 감시·후속 확인 다시 쓰기

후속 확인·긴급 감시 루틴(04)은 하루 중 알린 사건을 그때의 최신 리포트 맨 위에 덧붙여. 새벽에 알린 사건은 전날 아침 리포트에 붙어 있어서, 아침에 사람들이 보는 오늘 리포트에는 없어. 그래서 이런 사건은 이전 보고에서 다룬 것으로 보지 말고 오늘 리포트에 다시 자세히 써.

1. 대상: 직전 보안 리포트(실행일보다 앞선 날짜 중 가장 최근)의 `generated_at` 뒤에 알린 것. `generated_at`이 없으면 그 날짜 08:25 KST로 봐.
   - `watch/watchlist.json`의 `alerted` 중 `at`이 그 뒤인 것
   - `items` 중 `status`가 `done`이고 `done_at`이 그 뒤인 것
   - 직전 리포트 맨 위의 `## 긴급 감시 (…)`·`## 후속 확인 (…)` 절도 함께 읽어.
2. 원문을 다시 열어 그 사이 바뀐 것(수정 버전, KEV 등재, 실제 악용, 벤더 공지)을 확인해.
3. '주요 항목'에 '항목 형식'대로 써. 우선순위는 이 파일의 '우선순위 기준'으로 다시 매기고, 같은 사건의 식별번호가 여러 개면 한 항목으로 묶어.
4. 첫 문단 첫 문장에 언제 알렸는지 밝혀. 예: "11월 26일 03:15 긴급 감시로 먼저 알린 사건입니다."
5. Node.js·TypeScript와 관계없는 사건이면 영향 범위 문단 첫머리에 그 사실을 밝혀(예: "Node.js 드라이버 `mongodb` 자체의 CVE는 없습니다.").
6. 할 일이 있으면 '오늘 할 일'에도 한 줄 넣어.

### 후속 확인 등록

정해진 시점에 나올 예정이라 오늘 아침에는 확인할 수 없는 것이 있으면 `watch/watchlist.json`에 올려. 3시간마다 도는 후속 확인 루틴(04)이 확인해 나오면 리포트에 덧붙이고 알린다.

- 올릴 것: 예고된 보안 릴리스(예: "Next.js 11월 3일 보안 릴리스"), 패치 배포 예고, 공개 대기 중인 권고처럼 **언제 나올지 정해진 것**. 막연한 "추가 정보 대기"는 올리지 마.
- 형식은 `scheduler/04-security-watch.md`의 '대기 목록 형식'을 따르고, 기한(`until`)은 최대 7일 뒤로 잡아. 이미 같은 항목(`id`)이 열려 있으면 다시 올리지 마. 열린 항목은 최대 5개까지.
- 올렸다면 리포트의 해당 항목에 "후속 확인 등록됨"이라고 한 줄 적어.
- 반대로 열린 항목이 오늘 아침 이미 공개된 것을 확인했다면, 리포트에서 다루고 그 항목의 `status`를 `done`(`done_at`, `result` 포함)으로 바꿔. 후속 확인 루틴이 같은 알림을 다시 보내지 않게 하려는 것이다.
- 등록 현황(새로 올린 항목, 열린 항목)은 조사 기록에 적어.

### 항목 형식 (P1·P2)

- 제목: `### ① [P1] 제품 — 한 줄 요약`
- 첫 문단: 무슨 일인지, 공격 조건과 악용 가능성을 2~3문장으로
- 둘째 문단: 영향 범위를 1~2문장으로. 누가 해당하고 누가 해당하지 않는지 분명히 적어(예: "일반 EC2·S3 사용 환경 전체가 아니라 이 MCP 서버를 쓰는 경우만 해당합니다"). 공식 자료가 밝힌 영향보다 부풀리지 마.
- 값 표: `| 영향 버전 | 수정 버전 | 식별번호 | CVSS | KEV·실제 악용 |`. 확인된 값만 적고 나머지는 "확인 불가"로 적어. 한 사건에 제품이나 식별번호가 여럿이면 `| 대상 | 식별번호 | CVSS | 내용 | 수정 버전 |`로 쓰고, KEV·실제 악용은 표 아래 문장으로 적어.
- 인용(`>`) 한 번: 독자가 꼭 가져가야 할 할 일이나 영향
- 조치: 짧은 목록 1~3개. 내가 쓰는 버전을 모르니 "○○ 버전을 쓰고 있다면"처럼 조건을 붙이고 "~해야 합니다"나 "~하면 됩니다"로 끝내. 임시 완화책이 있으면 함께 적어.
- 원문: `- 원문: [이름](URL) (YYYY-MM-DD)`. 공개일과 DB 등록일이 다르면 둘 다 적어.
- 항목 하나는 1,300자 안으로 써.

### 우선 참조 출처

| 분야 | 출처 |
|---|---|
| 공통 | '조사 절차'의 목록(AWS Security Bulletins, OSV의 GitHub 보안 DB 권고·악성 패키지, CISA KEV, NVD 스캔), 벤더 공지 표(6번) |
| 클라우드 (AWS) | AWS Security Bulletins, AWS 서비스별 보안 공지 |
| AI·개발 도구 | Claude Code 변경 이력·GitHub 보안 권고, OpenAI Codex 릴리스·보안 권고, Cursor 보안 공지·변경 이력, GitHub Changelog(Copilot), Gemini CLI 보안 권고, MCP 공식 SDK 보안 권고, Vercel AI SDK·LangChain.js 릴리스와 GitHub 보안 권고 |
| 런타임·프레임워크 | Node.js 보안 릴리스, Next.js 보안 블로그, React 블로그, NestJS 릴리스 |
| 데이터베이스 | PostgreSQL 보안 정보, Oracle Critical Patch Update(MySQL, 1·4·7·10월), MariaDB 보안(분기 패치 사이의 CVE는 NVD 스캔으로), MongoDB 보안 경고, Redis·Valkey GitHub 보안 권고, Elastic 보안 공지 |
| 공급망·CI/CD·인프라 | GitHub 블로그·Changelog, GitLab 보안 릴리스, Docker 보안 공지, nginx 보안 권고, OpenSSL 취약점 목록, OpenSSH 릴리스 노트, Git 보안 권고(`git/git` GitHub 보안 권고) |
| 보조 | 보안 업체 분석(Socket, Snyk, StepSecurity, Wiz 등). 공급망 사건을 빨리 알려 주지만 1차 자료로 확인되지 않으면 "미확인 보도"로 분리해. Hacker News(8번)는 놓친 사건을 찾는 데만 쓰고 출처로 쓰지 않는다. |

확인되지 않은 CVE, 버전, 악용 사례를 만들어내지 마.
