# 보안 리포트 누락 보완 (NVD 스캔·조회 실패 판정) — 기획서

> 상태: **구현 중 (2026-11-06)**. 작업 파일·스크립트 수정과 로컬 검증 완료, 배포 전
> 남은 것: 커밋·배포(사용자 요청 시), 다음 04 회차 실행 기록 확인, 11월 7일 아침 리포트 확인
>
> 구현 변경점 (계획 대비):
> - NVD 거르기와 Hacker News 조회를 작업 파일에 명령으로 적는 대신 `scheduler/scripts/nvd_scan.py`, `hn_top.py`로 만들었다. 03과 04가 같은 거르기를 쓰고, 로컬에서 같은 명령으로 검증할 수 있다.
> - 설명 키워드만으로는 엉뚱한 제품이 많이 섞여서(16건 중 13건), 키워드가 맞은 CVE는 CVE.org 기록의 영향 제품(vendor·product)으로 대상 제품인지 한 번 더 가른다. 긴급 감시 기준(`alert`)도 스크립트가 계산한다.
> - Hacker News는 보안 단어로만 거르지 않고 100점 이상 글 제목을 모두 보여 준다. 이번 사건의 하루 1위 글 제목이 "sshole"이라 단어로는 못 잡는다.
> - README 기획 표에 빠져 있던 Next.js 16.4.5, 검색 결과 이름·아이콘 기획서도 함께 넣었다. 구조 트리의 "작업 3개"를 "작업 4개"로 고쳤다.

## 0. TL;DR

11월 6일 보안 리포트가 OpenSSH 인증 우회(CVE-2026-123158, CVSS 8.1)를 놓쳤다. 같은 날 MariaDB 권한 우회(CVE-2026-102523, CVSS 8.0)도 놓치고 "MySQL·MariaDB 이상 없음"으로 적었다. 원인은 npm 밖 제품(서버·DB·인프라)의 CVE를 훑는 목록이 없고, 벤더 페이지는 리다이렉트를 따라가지 않거나 갱신이 늦은 보안 페이지만 봤기 때문이다. NVD를 날짜 구간으로 한 번에 받아 점검 대상 제품을 거르는 단계를 아침 리포트(03)와 긴급 감시(04)에 넣고, 조회 실패를 "이상 없음"으로 쓰지 않도록 판정을 강화한다.

## 1. 범위

- 포함
  - 03: NVD 날짜 구간 스캔(직전 48시간), 벤더 공지 확인 주소 명시, `curl` 조회 실패 판정
  - 04 긴급 감시: NVD 스캔(조사 기간 3시간 30분)과 알림 기준
  - "이상 없음으로 확인한 대상"을 쓰는 조건
- 제외
  - 점검 대상 제품 추가(U3에서 따로 정한다)
  - Linux 커널 CVE의 NVD 스캔. 하루 수십 건이라 지금처럼 KEV와 배포판 공지로만 본다.
  - GeekNews 수집. 자동 접속을 막고 반복하면 신고하겠다는 안내가 나온다(아래 2절).
  - 사이트(`web/`) 변경. 태그 없음.

## 2. 현재 (사실 확인, 2026-11-06)

- **놓친 건**
  - CVE-2026-123158: OpenSSH 10.6p2 미만의 Linux `sshd`가 musl libc에 PAM 없이 빌드되면 비밀번호 인증을 우회할 수 있다. 일부 계정 구성에서 256 ~ 1024자의 아무 비밀번호나 통과한다. CVSS 8.1 (`AV:N/AC:H/PR:N/UI:N`). OpenSSH는 "critical security workaround"라고 적었다.
    - OpenSSH 10.6p2 릴리스 2026-11-05, CVE 공개 2026-11-06 00:46 KST, NVD 등록 01:17 KST. 11월 6일 리포트의 조사 기간(11-05 08:25 ~ 11-06 08:25) 안이다.
    - 예: Alpine Linux. Alpine은 PAM판을 `openssh-server-pam`으로 따로 내서, 기본 `openssh-server`가 PAM 없는 구성이다.
  - CVE-2026-102523: MariaDB 10.11.1 이상 ~ 10.11.19 미만 등에서 `ALTER TABLE ... CONVERT ... PARTITION`으로 권한 없는 테이블을 읽거나 바꿀 수 있다. CVSS 8.0 (`PR:L`). 수정 10.11.19, 11.4.13, 11.8.9, 12.3.3, 13.0.2. NVD 등록 11-06 01:17 KST. 리포트는 "MySQL·MariaDB 이상 없음"으로 적었다.
- **11월 6일 보안 루틴 실행 기록**(Opus 5.5, 320초, 56턴)
  - 조회한 목록: AWS RSS, OSV(npm·GitHub Actions), KEV, npm 레지스트리, 벤더 페이지(undici, Codex, Cursor, StepSecurity·Aikido·Wiz·Socket, GitHub Changelog, Anthropic SDK, LangChain.js, Gemini CLI, Next.js, nginx, OpenSSL, VS Code, Valkey, Redis, Docker, MongoDB)
  - OpenSSH: `curl -s https://www.openssh.com/releasenotes.html`은 리다이렉트를 따라가지 않아 301 안내 페이지(510바이트)만 받았다. 그 뒤 WebFetch로 `openssh.org/security.html`을 열었는데, 이 페이지는 마지막 항목이 2025-04-09라 10.6p2가 없다. 결국 "새 공지 없음"으로 판단했고, 리포트 본문에는 OpenSSH를 아예 적지 않았다.
  - NVD는 조회하지 않았다. MariaDB 보안 페이지도 보지 않았다.
- **04 긴급 감시**: KEV, OSV(npm·Actions), Node.js 보안 피드, AWS RSS만 본다. KEV에 없는 서버·DB CVE는 볼 길이 없다.
- **NVD API 2.0**(로컬에서 11-06 확인)
  - `https://services.nvd.nist.gov/rest/json/cves/2.0?pubStartDate=…&pubEndDate=…&resultsPerPage=2000`으로 구간 전체를 받을 수 있다. 11-05 23:25 UTC까지 24시간은 678건, 1.3MB, 요청 한 번.
  - 이 구간을 제품 키워드로 거르면 16건이 나오고, 그 안에 CVE-2026-123158과 CVE-2026-102523이 둘 다 있다. 키워드만 맞고 대상이 아닌 것도 섞인다(ModSecurity 설명의 "nginx", Kubeflow 설명의 "Kubernetes").
  - 키 없이 30초에 5회까지 요청할 수 있다. 구간 조회는 한두 번이라 충분하다.
  - 루틴 환경에서 NVD 접속은 아직 확인하지 않았다. 실행 기록상 `github.com`만 `curl`이 막히고, 다른 호스트는 열려 있었다.
- **GeekNews**: 로컬에서 `curl`로 연 검색·새 글 페이지가 차단 안내("자동접속을 반복하면 … 신고할 수 있습니다")를 돌려줬다. 루틴에 넣지 않는다.

## 3. 결정 사항

### 확정 (사용자 2026-11-06)

- D1 ~ D5대로 진행하고, 확인 필요 세 가지는 모두 권장안으로 한다("다 추천으로 변경").
  - U1: Hacker News 대조를 넣는다.
  - U2: 11월 6일 리포트는 다시 만들지 않고 11월 7일 리포트에서 다룬다.
  - U3: 점검 대상에 Git만 넣는다('공급망·CI/CD·인프라' 추가 대상, NVD 키워드).

### 구현 방향

- **D1. NVD 날짜 구간 스캔 (03 조사 절차에 추가)**
  - 직전 **48시간**에 공개된 CVE를 NVD에서 받는다. 48시간으로 잡으면 하루 놓친 것을 다음 날 잡는다. 이전 보고서 2개를 이미 읽으므로 중복은 거기서 거른다.
  - 점검 대상 중 npm 밖 제품 키워드로 설명을 거른다: OpenSSH, OpenSSL, nginx, PostgreSQL, MySQL, MariaDB, MongoDB, Redis, Valkey, Docker, containerd, runc, BuildKit, Kubernetes, GitLab, Node.js, Elasticsearch, OpenSearch.
  - 키워드만 맞은 것은 설명과 영향 제품(`configurations`의 CPE, 없으면 설명)으로 대상 제품 자체의 취약점인지 확인한다. 아니면 버린다.
  - 남은 것은 우선순위 기준(P1·P2·P3)대로 해당 분야에 넣는다. 벤더 공지가 있으면 벤더 공지를 원문으로 쓰고, 없으면 NVD를 원문으로 쓴다.
  - NVD 시각은 UTC다. `totalResults`가 2,000을 넘으면 `startIndex`로 다음 쪽을 받는다. 요청 사이는 6초 이상 띄운다.
- **D2. 조회 실패 판정 강화 (03·04 공통)**
  - 목록과 공지 페이지는 `curl -sL --max-time 30 -w '%{http_code}'`로 받는다. 리다이렉트를 따라가고, 200이 아니거나 본문이 안내 페이지 수준으로 작으면 조회 실패로 본다.
  - 조회 실패는 보고서에 적는다(지금 규칙 유지). 실패한 출처에 기대어 "이상 없음"을 쓰지 않는다.
  - 벤더 확인 주소를 표로 못 박는다. 보안 페이지가 늦게 갱신되는 제품은 릴리스 노트를 본다.
    - OpenSSH: `https://www.openssh.com/releasenotes.html` 맨 위 항목 날짜와 "Security" 절
    - OpenSSL: `https://openssl-library.org/news/vulnerabilities/`
    - nginx: `https://nginx.org/en/security_advisories.html`
    - PostgreSQL: `https://www.postgresql.org/support/security/`
    - MariaDB·MySQL·그 밖의 DB는 D1의 NVD 스캔으로 본다.
- **D3. "이상 없음으로 확인한 대상" 조건**: 그 제품의 벤더 확인과 NVD 스캔이 모두 성공하고 둘 다 신규가 없을 때만 적는다. 하나라도 실패했으면 "확인 실패: <출처>"로 적는다.
- **D4. 04 긴급 감시에 NVD 추가 (B의 5번)**
  - 조사 기간 3시간 30분을 `pubStartDate`로 받고, D1과 같은 키워드와 대상 확인을 한다.
  - 알릴 것: CVSS 9.0 이상, 또는 8.0 이상이면서 네트워크로 인증 없이 공격할 수 있는 것(`AV:N` 그리고 `PR:N`)
  - 이번 OpenSSH 건(8.1, `AV:N/PR:N`)은 알림 대상이고, MariaDB 건(8.0, `PR:L`)은 아침 리포트에서 다룬다.
  - 중복 확인은 지금 규칙(`alerted`, 최근 리포트 2개)을 그대로 쓴다.
- **D5. 오늘 놓친 두 건**: 48시간 스캔으로 11월 7일 아침 리포트가 다룬다. 이것을 배포 후 첫 검증으로 쓴다.

### 확인 필요

- **U1. 커뮤니티 안전망**: Hacker News 공식 검색 API(`hn.algolia.com`)로 직전 24시간 인기 글 중 보안 제목(CVE, vulnerability, exploit, bypass, compromised 등)을 받아, 위 목록에서 못 찾은 사건이 있는지 대조할지. 공급망 사고처럼 목록에 늦게 올라오는 사건을 빨리 잡는 그물이다. 권장: 넣는다(요청 한 번).
- **U2. 오늘(11-06) 리포트를 지금 다시 만들지**: 03을 수동 실행하면 오늘 파일을 덮어쓰고, 조사 기간이 실행 시각 기준으로 밀려 오전에 다룬 항목 일부가 빠질 수 있다. 권장: 다시 만들지 않고 11월 7일 리포트에서 다룬다.
- **U3. 점검 대상 추가**: 개발자 PC·서버에 거의 다 있는 Git, curl, sudo를 '공급망·CI/CD·인프라'의 추가 대상과 NVD 키워드에 넣을지. 권장: Git만 넣는다.

## 4. 구조

| 파일 | 바꿀 것 |
|---|---|
| `scheduler/scripts/nvd_scan.py` (새 파일) | NVD 구간 조회(쪽 넘김, 6초 간격, 한 번 재시도) → 설명 키워드 → CVE.org 영향 제품으로 대상 판정 → JSON 줄 출력, `alert` 계산. 실패 시 종료 코드 2 |
| `scheduler/scripts/hn_top.py` (새 파일) | Hacker News 검색 API로 최근 N시간, M점 이상 글을 점수순 출력. 보안 단어가 있으면 `[보안]`. 실패 시 종료 코드 2 |
| `scheduler/03-security-daily-report.md` | `curl -sL` 규칙(D2), 5번 NVD 스캔(D1), 6번 벤더 공지 표(D2), 7번 기존 "목록에 없는 사건", 8번 Hacker News 대조(U1), 점검 대상에 Git(U3), "이상 없음" 조건(D3), '우선 참조 출처' 갱신 |
| `scheduler/04-security-watch.md` | `curl -sL` 규칙(D2), B에 5번 NVD(D4) |
| `scheduler/README.md`, `README.md`, `CLAUDE.md` | 긴급 감시 설명, 보안 조회 스크립트 절, 구조, 기획 표 |

루틴 프롬프트(트리거 설정)는 바꾸지 않는다. 루틴은 실행할 때 `main`의 작업 파일을 읽는다.

## 5. 케이스

| 상황 | 동작 |
|---|---|
| NVD 응답이 200이 아니거나 시간 초과 | 한 번 다시 시도하고, 그래도 실패면 보고서에 "NVD 조회 실패"를 적는다. 04는 그 목록만 건너뛴다. |
| NVD에 CVSS가 아직 없음(`Received` 상태) | CNA 점수가 있으면 쓰고, 없으면 "확인 불가"로 적고 설명으로 우선순위를 판단한다. |
| 키워드만 맞음(ModSecurity의 nginx 등) | 대상 제품 자체가 아니면 버린다. |
| 벤더 릴리스는 나왔는데 CVE가 아직 없음 | 벤더 릴리스 노트로 다룬다(OpenSSH처럼 릴리스가 CVE보다 먼저 나온다). |
| 하루 동안 NVD 대상이 많음(예: 20건 이상) | P1·P2만 항목으로 쓰고 나머지는 "그 밖의 NVD 신규 N건"으로 묶는다. |

## 6. 작업 순서

1. `main`을 `dev`에 병합, `fix/security-coverage` 브랜치
2. 03 수정(D1 ~ D3), 04 수정(D2, D4), README 두 곳
3. 로컬 검증: 03·04에 적은 NVD 명령과 거르는 기준을 11-05 ~ 11-06 구간에 그대로 돌려 두 건이 나오는지
4. 커밋·배포(사용자 요청 시). 문서만 바뀌므로 태그 없음
5. 다음 04 회차 실행 기록에서 NVD 조회 성공 확인, 11월 7일 아침 리포트에서 두 건 확인

## 7. 검증

- [x] (기획 전 확인) NVD 24시간 구간 678건을 키워드로 걸러 CVE-2026-123158, CVE-2026-102523 포함 16건
- [x] `python3 -I scheduler/scripts/nvd_scan.py --start 2026-11-04T23:25:00Z --end 2026-11-05T23:25:00Z` (11월 6일 리포트 구간): 전체 678건 → 대상 제품 3건(CVE-2026-102523 MariaDB 8.0 `alert: false`, CVE-2026-123158 OpenSSH 8.1 `alert: true`, CVE-2026-116472 ingress-nginx 2.7), 이름만 나온 다른 제품 15건(ModSecurity, Kyverno, Kubeflow 등)
- [x] `--hours 48` (11-06 15:15 KST 기준): 전체 1,036건 → 대상 6건(위 3건 + Git for Windows 2건, Snowflake Node.js 드라이버 1건). `--hours 3.5`: 5건 → 대상 0건
- [x] `python3 -I scheduler/scripts/hn_top.py --hours 24 --points 100`: 28개. 1위 "sshole"(2,519점), `[보안]` 표시 "Alpine Linux Security Advisory: OpenSSH-server password authentication bypass"(618점). 11월 5일 18:46 KST부터 OpenSSH 글이 올라와 있었다(179점)
- [x] 네트워크 실패(프록시를 닫힌 포트로): 두 스크립트 모두 "조회 실패" 출력, 종료 코드 2
- [ ] 04 회차 실행 기록: NVD 조회 성공, 조회 실패 없음
- [ ] 11월 7일 보안 리포트: OpenSSH·MariaDB 항목, "이상 없음" 줄에 MariaDB가 빠짐, Hacker News 대조 실행
