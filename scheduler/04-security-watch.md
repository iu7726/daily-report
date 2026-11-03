# IT 보안 후속 확인·긴급 감시

- 작업 ID: `security-watch`
- 유형: 조건부 알림형
- 일정: 3시간마다 15분 (KST 00:15·03:15·06:15·09:15·12:15·15:15·18:15·21:15, Cron UTC `15 */3 * * *`)

## 실행 프롬프트

아침 보안 리포트(03)는 하루 한 번이라 그 사이에 나온 공지는 다음 날 아침에야 다룬다. 이 작업은 그 빈틈을 메운다. 두 가지를 해.

- **A. 후속 확인**: 아침 리포트가 "곧 나올 예정"으로 남겨 둔 항목(대기 목록)이 나왔는지 확인한다.
- **B. 긴급 감시**: 핵심 기술에 **P1급 새 공지**가 떴는지 확인한다. P1급만 알리고, 나머지는 다음 날 아침 리포트에 맡긴다.

대부분의 회차는 둘 다 바뀔 것이 없다. 그럴 때는 아무것도 바꾸지 말고, 커밋도 알림도 없이 끝내.

공통 규칙의 '정확성'과 '글쓰기'를 따르고, '결과 저장'은 0단계(저장소 맞추기)만 해. 1~3단계(이전 보고 확인, 새 보고서 파일, frontmatter 작성)는 적용하지 마. 커밋·push·알림은 아래 절차대로 해.

### A. 후속 확인

1. `watch/watchlist.json`의 `items`에서 `status`가 `open`인 항목을 본다. 없으면 A를 건너뛰고 B로 가.
2. 실행 시각(KST) 기준으로 `until` 날짜가 지났으면 `status`를 `expired`로 바꾸고 넘어가. 알림은 보내지 마.
3. `sources`의 원문을 열어 `check`에 적힌 조건이 충족됐는지 확인해. 공식 원문으로 확인되지 않으면 충족되지 않은 것으로 봐. 원문에 접속하지 못하면 그 항목은 이번 회차를 건너뛰어(상태는 그대로).
4. 충족된 항목은 '리포트에 덧붙이기'대로 `## 후속 확인 (MM-DD HH:mm KST) — <항목 제목>` 절을 넣고, `status`를 `done`으로 바꾸고 `done_at`(KST, 예: `2026-11-04T03:15:00+09:00`)과 `result`(한 줄 요약)를 채워.

### B. 긴급 감시

조사 기간은 실행 시각부터 거슬러 올라간 **3시간 30분**이다(회차 간격 3시간에 시작 지연 여유 30분). 아래 목록을 `curl`로 받아 조사 기간에 새로 올라온 것만 봐.

1. **CISA KEV**: `https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json` (안 되면 `https://raw.githubusercontent.com/cisagov/kev-data/develop/known_exploited_vulnerabilities.json`). `dateAdded`는 날짜 단위라 최근 2일에 추가된 항목을 보고, 아래 '중복 확인'으로 이미 다룬 것을 거른다.
   - 알릴 것: `vendorProject`·`product`가 핵심 제품(아래 표)에 해당하는 항목
2. **OSV (GitHub 보안 DB 미러)**: `https://osv-vulnerabilities.storage.googleapis.com/npm/modified_id.csv`와 `.../GitHub%20Actions/modified_id.csv`. 최근 수정순이라 앞부분만 받으면 돼(`curl -s <URL> | head -n 2000`). 조사 기간에 수정된 ID만 `https://api.osv.dev/v1/vulns/<ID>`로 열어.
   - 알릴 것 ①: `GHSA-` 권고 중 `database_specific.severity`가 `CRITICAL`이고 `published`가 최근 2일 안이며, 다음 중 하나에 해당하는 것
     - 핵심 npm 패키지(아래 표)나 `actions/*` 공식 액션
     - 핵심 목록에 없어도 주간 다운로드 100만 이상인 npm 패키지(`https://api.npmjs.org/downloads/point/last-week/<패키지>`)
   - 알릴 것 ②: `MAL-` 악성 패키지 중 **이미 널리 쓰이던 패키지**의 악성 버전. `https://api.npmjs.org/downloads/point/last-week/<패키지>`의 주간 다운로드가 10만 이상이면 해당한다(인기 패키지 계정 탈취·변조 배포). 새로 만든 사칭 패키지는 알리지 마.
3. **Node.js 보안 릴리스**: `https://nodejs.org/en/feed/vulnerability.xml`. 조사 기간에 올라온 글을 열어 봐.
   - 알릴 것: 보안 릴리스가 실제로 나왔고 High 이상 취약점이 있는 경우
   - 예고 글(아직 릴리스 전)이면 알리지 말고, 릴리스 예정일로 대기 목록(A)에 항목을 올려.
4. **AWS Security Bulletins**: `https://aws.amazon.com/security/security-bulletins/rss/feed/`. 항목이 날짜순이 아니니 `pubDate`로 걸러.
   - 알릴 것: 핵심 AWS 서비스(아래 표)에 영향이 있고 고객이 조치해야 하는 공지, 또는 실제 악용이 확인됐다고 밝힌 공지
   - AWS 오픈소스 도구·SDK·샘플 공지는 알리지 마(아침 리포트가 다룬다).

| 구분 | 핵심 대상 |
|---|---|
| KEV 핵심 제품 | Node.js, Next.js, React, PostgreSQL, MySQL·MariaDB, MongoDB, Redis·Valkey, GitLab, GitHub(Enterprise Server·Actions), Docker, Kubernetes, nginx, OpenSSL, OpenSSH, Linux 커널, AWS 제품, VS Code, Anthropic·OpenAI 제품 |
| 핵심 npm 패키지 | `next`, `react`, `react-dom`, `react-server-dom-*`, `@nestjs/*`, `express`, `fastify`, `undici`, `typescript`, `pg`, `mysql2`, `mongodb`, `mongoose`, `ioredis`, `redis`, `prisma`, `@prisma/client`, `typeorm`, `@aws-sdk/*`, `jsonwebtoken`, `passport`, `axios`, `@anthropic-ai/claude-code`, `@anthropic-ai/sdk`, `@openai/codex`, `openai`, `@google/gemini-cli`, `@modelcontextprotocol/sdk`, `ai`, `langchain`, `@langchain/*` |
| 핵심 AWS 서비스 | IAM, EC2, S3, CloudFront, ALB, ECR, ECS·EKS, Lambda, RDS·Aurora, ElastiCache, Cognito, Secrets Manager·KMS |

**중복 확인**: 식별번호(CVE, GHSA, MAL, AWS 공지 번호)가 `watch/watchlist.json`의 `alerted`에 있거나, 가장 최근 보안 리포트 두 개(`reports/security-daily-report/` 아래 날짜가 가장 늦은 두 파일)에 이미 나오면 건너뛰어. 아침 리포트가 다룬 것을 다시 알리지 않으려는 것이다.

알릴 것이 있으면 '리포트에 덧붙이기'대로 `## 긴급 감시 (MM-DD HH:mm KST) — <제목>` 절을 넣고, `alerted`에 `{"id": "<식별번호>", "title": "<제목>", "at": "<KST 시각>"}`를 추가해. 같은 사건의 식별번호가 여러 개면(CVE와 GHSA 등) 모두 넣어.

목록 조회에 실패하면 그 목록은 이번 회차를 건너뛰어. 실패만 있었으면 커밋하지 마(다음 회차와 아침 리포트가 다시 본다).

### 리포트에 덧붙이기

가장 최근 보안 리포트(`reports/security-daily-report/YYYY/MM/DD.md` 중 날짜가 가장 늦은 것)의 본문에서 `기준 시각:` 줄 바로 다음에 절을 넣어. 사람들은 최신 리포트를 보니까 항목을 처음 올린 리포트가 아니라 최신 리포트에 넣는다. 여러 절이 쌓이면 최근 것이 위로 오게 해.

```markdown
## 긴급 감시 (MM-DD HH:mm KST) — <제목>

<무엇이 나왔는지 2~3문장. 누가 해당하고 누가 해당하지 않는지 한 줄>

| 영향 버전 | 수정 버전 | 식별번호 | CVSS | KEV·실제 악용 |
|---|---|---|---|---|
| … | … | … | … | … |

- 조치: <해야 할 일 1~3개>
- 원문: <링크> (공개 YYYY-MM-DD HH:mm KST)
```

후속 확인(A)은 제목만 `## 후속 확인 (MM-DD HH:mm KST) — <항목 제목>`이고 형식은 같다. 값 표는 확인된 값이 있을 때만 넣어.

frontmatter는 바꾸지 마. 단, 덧붙인 내용이 P1(실제 악용, CISA KEV, 인증 없는 원격 코드 실행)이면 `level`만 `urgent`로 올려. 긴급 감시(B)로 알리는 것은 모두 P1급이다.

### 커밋·알림

- 바뀐 것이 없으면 커밋하지 말고 끝내.
- 바뀐 것이 있으면 `watch/watchlist.json`과 수정한 리포트만 `git add`해서 커밋하고 `main`에 push해. 거부되면 `git pull --rebase origin main` 후 다시 push해.
  - 메시지: `report(security-watch): YYYY-MM-DD HH:mm 후속 확인`, `… 긴급 감시`, 둘 다면 `… 후속 확인·긴급 감시`
- 푸시 알림(PushNotification)은 알릴 것이 있을 때만 보내. 기한 만료나 예고 등록만 있었으면 보내지 마.
  - 긴급 감시: `[보안 긴급] <제목> · <한 줄 요약>`
  - 후속 확인: `[보안 후속 확인] <항목 제목> · <한 줄 요약>`

### 대기 목록 형식

`watch/watchlist.json`

```json
{
  "items": [
    {
      "id": "nextjs-security-release-2026-11",
      "title": "Next.js 11월 보안 릴리스",
      "check": "Next.js 보안 블로그나 GitHub 보안 권고에 11월 보안 릴리스(영향 버전, 수정 버전, CVE)가 공개됨",
      "sources": ["https://nextjs.org/blog/security", "https://github.com/vercel/next.js/security/advisories"],
      "report": "reports/security-daily-report/2026/11/03.md",
      "created": "2026-11-03",
      "until": "2026-11-06",
      "status": "open",
      "done_at": null,
      "result": null
    }
  ],
  "alerted": [
    { "id": "CVE-2026-00000", "title": "예시 — 긴급 감시로 알린 항목", "at": "2026-11-04T15:15:00+09:00" }
  ]
}
```

- `items`(A): 아침 보안 리포트가 올리고 이 작업이 상태를 바꾼다.
  - `id`: 영문 소문자와 `-`. 같은 대상을 두 번 올리지 않는 기준이야.
  - `report`: 이 항목을 올린 리포트. 후속 확인 절은 최신 리포트에 넣는다.
  - `until`: 이 날짜(KST)가 지나면 확인을 멈춰. 최대 등록일 + 7일.
- `alerted`(B): 긴급 감시로 알린 식별번호. 같은 것을 두 번 알리지 않는 기준이야.
- 끝난 항목(`done`, `expired`)과 `alerted`는 기록으로 남겨. 30일이 지난 것은 지워도 돼.
