---
title: "IT 보안 이슈 데일리 리포트"
task: security-daily-report
date: 2026-11-26
generated_at: 2026-11-26T08:40:00+09:00
level: notice
summary: "새 P1은 없습니다. AWS Config 자동 조치로 Session Manager 감사 로그 런북을 써 왔다면 이번 주 안에 리비전을 바꾸고 설정 문서를 점검해야 합니다."
headline: "AWS Config 런북 명령 주입, MongoDB 드라이버 CVE"
description: "AWS Config 자동 조치 런북의 Session Manager 설정 주입, 새벽 긴급 감시로 알린 MongoDB 드라이버 CVE, GitLab 보안 패치 13건, TypeScript tsc를 가로채 GitHub Actions 비밀을 빼 가는 npm 악성 패키지를 정리했습니다."
tags: ["AWS", "CVE-2026-134070", "Kiro", "GitLab", "MongoDB", "TypeScript", "GitHub Actions", "npm"]
metrics: {p1: 0, p2: 2, p3: 7, malicious_npm: 32, kev_added: 10}
---
[2026-11-26 IT 보안 이슈 리포트]
기준 시각: 2026-11-26 08:40 KST

## 오늘 할 일

- ① AWS Config 런북을 쓰고 있다면 이번 주 안에 리비전 고정을 최신으로 바꾸고, 리전별 Session Manager 설정 문서도 점검해야 합니다.
- ② 새벽에 알린 MongoDB 드라이버 CVE는 Node.js 드라이버(`mongodb`)와 관계없습니다. Python 드라이버를 쓰는 서비스만 4.20.2 이상으로 올리면 됩니다.
- ⑥ GitLab을 직접 운영한다면 19.6.2 / 19.5.9 / 19.4.11로 올려야 합니다.
- Ruby2Shell PoC는 예정일(11월 25일)이 지났지만 아직 나오지 않았습니다. GHES·GitLab·Ruby 패치를 마치지 않았다면 오늘 마쳐야 합니다. 수정 버전은 아래 '아직 조치 기간인 P1' 표에 있습니다.

## 한눈에 보기

| 분야 | 상태 | 항목 |
|---|---|---|
| 클라우드 (AWS) | P2 | ① AWS Config 런북 |
| AI·개발 도구 | P3 | ③ Kiro Web |
| 런타임·프레임워크 | P3 | ④ cron-parser |
| 데이터베이스 | P2 | ② MongoDB 드라이버, ⑤ PostgreSQL 연동 확장 |
| 공급망·CI/CD·인프라 | P3 | ⑥ GitLab, ⑦ Docker Engine, ⑧ npm 악성 패키지, ⑨ 1Password |

```trend
p1, p2
```

## 주요 항목

```timeline
- 11-25 08:50 | 어제 아침 보안 리포트
- 11-26 03:15 | 긴급 감시: MongoDB C 드라이버와 Laravel 패키지 CVE 3건 | urgent
- 11-26 06:15 | 긴급 감시: MongoDB Python 드라이버 CVE 2건 | urgent
- 11-26 08:40 | 오늘 아침 리포트, ② 항목에서 다시 설명
```

### ① [P2] AWS Config 자동 조치 런북 — Session Manager 설정 문서에 명령 주입

AWS 관리형 런북 `AWSConfigRemediation-EnableSystemsManagerSessionManagerAuditLogsToS3`가 `S3KeyPrefix` 값을 제대로 검증하지 않아, 아래 순서로 명령이 주입됩니다.

```flow
런북을 실행할 수 있는 사용자가 `S3KeyPrefix` 값을 조작
리전에 `SSM-SessionManagerRunShell` 문서가 없으면 런북이 조작된 설정으로 문서를 만듦
다른 사용자가 Session Manager 세션을 열면 심어 둔 명령이 인스턴스에서 실행됨
```

이 런북을 AWS Config 자동 조치나 직접 실행으로 쓰는 계정이 해당하고, Session Manager를 쓰지 않거나 이 런북을 실행한 적이 없다면 해당하지 않습니다.

| 영향 버전 | 수정 버전 | 식별번호 | CVSS | KEV·실제 악용 |
|---|---|---|---|---|
| 2026-10-22(UTC) 이전 리비전 | 리전별 최신 리비전 | CVE-2026-134070 | 8.0 (CVSS 3.1) · 7.2 (CVSS 4.0) | 미등재 · 확인 불가 |

> 최신 리비전으로 바꿔도 이전 리비전은 2027년 1월 15일까지 실행할 수 있고, 이미 심어진 설정도 지워지지 않습니다. 리비전 교체와 설정 문서 점검을 함께 해야 합니다.

- Automation 실행, State Manager 연결, AWS Config 자동 조치 설정의 리비전 고정을 최신으로 바꿔야 합니다.
- 이전 리비전이 사라질 때까지는 신뢰할 수 있는 `SSM-SessionManagerRunShell` 문서를 모든 리전에 미리 만들어 두거나, 신뢰하지 않는 사용자가 이전 리비전을 실행하지 못하게 막아야 합니다.
- 이 런북이 문서를 처음 만든 리전이 있다면 `shellProfile`, `runAsEnabled`·`runAsDefaultUser`, 세션 시간, 로그 대상 값을 점검해야 합니다. 주입된 실행은 항상 "DOCUMENT CREATE OR UPDATE FAILED"로 실패하니 실행 기록에서 이 오류를 찾으면 됩니다.
- 원문: [AWS 2026-203-AWS](https://aws.amazon.com/security/security-bulletins/rss/2026-203-aws/) (2026-11-26) · [NVD CVE-2026-134070](https://nvd.nist.gov/vuln/detail/CVE-2026-134070) (2026-11-26)

### ② [P2] MongoDB 드라이버 — C·Python 드라이버와 Laravel 패키지 CVE 일괄 공개

11월 26일 03:15와 06:15 긴급 감시로 먼저 알린 사건입니다. MongoDB가 이날 새벽 여러 언어 드라이버의 CVE를 한꺼번에 NVD에 올렸고, 긴급 감시는 그중 인증 없이 네트워크로 공격할 수 있는 5건을 알렸습니다.

Node.js 드라이버(`mongodb`) 자체의 CVE는 없습니다. C 드라이버(또는 이를 감싼 다른 언어 드라이버), Python 드라이버, Laravel MongoDB 패키지를 쓰는 서비스만 해당합니다.

| 대상 | 식별번호 | CVSS 4.0 | 내용 | 수정 버전 |
|---|---|---|---|---|
| C 드라이버 | CVE-2026-135224 | 9.3 | 인증서 폐기 응답의 서명자를 검증하지 않아 폐기된 인증서가 통과 | 확인 불가 |
| Python 드라이버 | CVE-2026-135146 | 9.1 | TLS 인증서 폐기 확인 누락(폐기 확인 기능을 켠 경우) | 4.20.2 |
| Python 드라이버 | CVE-2026-135898 | 8.8 | C 확장 BSON 디코더의 범위 밖 읽기로 프로세스 종료, 메모리 일부 노출 | 4.20.2 |
| Laravel MongoDB | CVE-2026-135147 | 8.3 | 카운터 갱신 함수에 넘긴 외부 입력을 쿼리 표현식으로 해석 | 확인 불가 |
| C 드라이버 | CVE-2026-135134 | 8.2 | 조작된 서버 탐색 응답으로 클라이언트 종료(서비스 거부) | 확인 불가 |

KEV 등재와 실제 악용은 확인되지 않았습니다. C 드라이버와 Laravel 패키지의 수정 버전은 아직 확인하지 못했습니다.

> Node.js 드라이버만 쓴다면 따로 할 일은 없습니다. Python 드라이버는 4.20.2 이상으로 올리면 되고, Laravel 패키지는 수정판이 나올 때까지 카운터 갱신 함수에 사용자 입력을 그대로 넘기면 안 됩니다.

같은 날 PHP 드라이버 1건, Laravel 패키지 4건, Rust·Ruby·C 드라이버 3건도 올라왔습니다. 이 중 Node.js에 닿는 것은 암호화 라이브러리 libmongocrypt의 메모리 누수(CVE-2026-135223, 5.3) 하나입니다. `mongodb-client-encryption`이 이 라이브러리를 쓰지만, 키 저장 컬렉션에 쓸 권한이 있어야 공격할 수 있고 수정 버전은 아직 확인하지 못했습니다.

- 원문: [NVD CVE-2026-135224](https://nvd.nist.gov/vuln/detail/CVE-2026-135224) · [CVE-2026-135146](https://nvd.nist.gov/vuln/detail/CVE-2026-135146) · [CVE-2026-135898](https://nvd.nist.gov/vuln/detail/CVE-2026-135898) · [CVE-2026-135147](https://nvd.nist.gov/vuln/detail/CVE-2026-135147) · [CVE-2026-135134](https://nvd.nist.gov/vuln/detail/CVE-2026-135134) · [CVE-2026-135223](https://nvd.nist.gov/vuln/detail/CVE-2026-135223) (모두 2026-11-26)

## 참고

- ③ AWS Kiro Web — 에이전트가 읽은 파일이나 웹 페이지 속 도구 호출 표기를 일부 모델이 되풀이해 동의 확인 없이 명령으로 실행됐고, AWS가 10월 30일 고쳤습니다(CVE-2026-136267). 5월 18일 ~ 10월 30일에 DeepSeek v3.2, GLM-5, MiniMax M2.1 / M2.5, Qwen3-coder-next로 신뢰할 수 없는 저장소나 웹 페이지를 다뤘다면 환경에 넣어 둔 자격 증명을 점검하면 됩니다. · [AWS 2026-202-AWS](https://aws.amazon.com/security/security-bulletins/rss/2026-202-aws/)
- ④ `cron-parser` 5.10.0 이하 — 아주 큰 cron 식 하나로 Node.js 힙을 고갈시켜 프로세스를 죽일 수 있습니다(CVE-2026-137058). 외부에서 받은 cron 식을 그대로 파싱하는 경우만 해당하고, 5.10.1에서 고쳐졌습니다. · [GHSA-r9w7-75q6-r884](https://github.com/harrisiirak/cron-parser/security/advisories/GHSA-r9w7-75q6-r884)
- ⑤ PostgreSQL 연동 확장 — `mysql_fdw` 2.10.0 미만에서 원격 MySQL 서버가 돌려준 열 정보로 `IMPORT FOREIGN SCHEMA`를 실행한 세션에 임의 SQL이 실행됩니다(CVE-2026-62154). `mongo_fdw` 2건과 psqlODBC 1건도 올라왔고, 이 확장이나 드라이버를 설치한 경우만 해당합니다. · [EDB 권고](https://www.enterprisedb.com/docs/security/advisories/cve202662154/) · [mysql_fdw 2.10.0](https://github.com/EnterpriseDB/mysql_fdw/releases/tag/REL-2_10_0)
- ⑥ GitLab 19.6.2 / 19.5.9 / 19.4.11 — 보안 수정 13건 중 인증 없이 가능한 것은 Service Desk 이메일 퀵 액션 실행과 정규식 서비스 거부 두 건이고, CVSS는 6.5와 5.3입니다. 번들 NGINX도 1.31.9로 올라가고, GitLab.com에는 이미 적용됐습니다. · [GitLab 패치 릴리스](https://docs.gitlab.com/releases/patches/patch-release-gitlab-19-6-2-released/)
- ⑦ Docker Engine — `docker cp`로 파일을 넣는 동안 악성 컨테이너가 경쟁 조건으로 읽기 전용 바인드 마운트를 쓰기 가능하게 남길 수 있습니다(CVE-2026-135124, 4.1). 함께 올라온 `moby/sys/user` 문제(CVE-2026-135844, 5.6)는 29.10.1에서 고쳐졌습니다. · [GHSA-vfmq-r373-x89f](https://github.com/moby/moby/security/advisories/GHSA-vfmq-r373-x89f) · [GHSA-ffh6-8jcg-cjmw](https://github.com/moby/sys/security/advisories/GHSA-ffh6-8jcg-cjmw)
- ⑧ npm 악성 패키지 32건 — `git-crt-creator`·`git-iss-creator`는 `typescript`보다 나중에 설치되면 `node_modules/.bin/tsc`를 차지해, CI에서 `tsc`를 부르는 순간 GitHub Actions 비밀을 꺼내 다른 저장소의 이슈로 올립니다. `qs`를 흉내 낸 `qs-native-parse` 등 네이티브 애드온 로더 5건과 `create-ai-agent-setup`도 악성으로 지정됐습니다. · [OSV MAL-2026-20604](https://osv.dev/vulnerability/MAL-2026-20604) · [OSV MAL-2026-20605](https://osv.dev/vulnerability/MAL-2026-20605)
- ⑨ 1Password — 직원의 회사 GitHub 계정을 거쳐 공격자가 내부 저장소와 CI/CD에 들어가, 일부 고객의 이름·이메일과 계정 정보를 가져갔다고 발표했습니다. 볼트 내용과 키는 영향이 없으니 초대나 계정 복구를 가장한 피싱 메일만 조심하면 됩니다. · [1Password 공지](https://1password.com/blog/update-on-nov-2026-security-incident)

## 아직 조치 기간인 P1

조사 기간에 KEV에 10건이 새로 올랐지만 모두 점검 대상 밖입니다(목록은 조사 기록).

| 식별번호 | 대상 | 해야 할 일 |
|---|---|---|
| CVE-2026-132825 외 | Ruby2Shell — GHES·GitLab·Ruby (11월 19일 ~ 25일 보고) | GHES 3.22.6 / 3.21.11 / 3.20.13 / 3.19.17, GitLab 19.6.1 이상, Ruby 4.0.10 / 3.4.13 / 3.3.14 |
| CVE-2026-59726 | ruflo MCP 브리지 (11월 25일 보고) | Docker Compose로 띄웠다면 3001·27017 포트를 막고 3.16.3 이상으로 다시 배포, AI 제공사 API 키 교체 |
| CVE-2026-123007 외 | NGINX HTTP/2 (11월 19일 보고) | 1.30.7 / 1.31.9 이상, 가능하면 1.30.8 / 1.31.10 |

## 오늘 확인할 명령

```bash
# ① 런북 최신 리비전과 Session Manager 기본 설정 문서 (리전마다)
aws ssm describe-document --name AWSConfigRemediation-EnableSystemsManagerSessionManagerAuditLogsToS3 --region ap-northeast-2 --query "Document.LatestVersion"
aws ssm get-document --name SSM-SessionManagerRunShell --region ap-northeast-2 --query Content --output text
aws configservice describe-remediation-configurations --config-rule-names <규칙 이름> --region ap-northeast-2

# ② MongoDB 자동 암호화(libmongocrypt)를 쓰는지
npm ls --all mongodb mongodb-client-encryption

# ④ cron-parser (5.10.1 이상이면 해결)
npm ls --all cron-parser

# ⑥ GitLab 버전 (19.6.2 / 19.5.9 / 19.4.11 이상이면 해결)
sudo gitlab-rake gitlab:env:info | grep -i 'GitLab information' -A 2

# ⑦ Docker Engine 버전 (29.10.1 이상)
docker version --format '{{.Server.Version}}'

# ⑧ 악성 패키지 설치 여부와 tsc가 진짜 typescript를 가리키는지
npm ls --all git-crt-creator git-iss-creator qs-native-parse qs-parse-native fast-url-utils array-native-utils native-stream-parser create-ai-agent-setup glbl-agent grammy-key
head -c 200 node_modules/.bin/tsc; readlink -f node_modules/.bin/tsc
```

## 미확인 보도

- PolinRider — StepSecurity는 `Eternity0207` 계정이 10월 19일 ~ 11월 25일 여러 오픈소스 저장소의 열린 PR에 악성 로더를 강제 푸시로 끼워 넣었고, 승인 없이 돈 포크 PR의 CI가 피해를 봤다고 분석했습니다. 1차 공지는 찾지 못했습니다. 외부 기여자 워크플로 승인과 "마지막 푸시 승인 필수" 설정을 켜 두면 이 수법을 막을 수 있습니다. · [StepSecurity 분석](https://www.stepsecurity.io/blog/polinrider-malware-open-source-pull-requests)
- 소인수분해 소문 — "AI 연구소가 소인수분해를 다항 시간에 풀었다"는 소문과 달리, Google이 공개한 논문은 기존 방법과 같은 준지수 시간대입니다. RSA·ECC가 깨졌다는 1차 자료는 없습니다. · [Google Research 논문 목록](https://github.com/google-research/google-research/tree/master/cogentic_research_papers)

## 조사 기록

- 조사 범위: 2026-11-25 08:25 ~ 11-26 08:25 KST. AWS Security Bulletins, OSV(npm·GitHub Actions), CISA KEV(catalogVersion 2026.11.25), NVD 스캔(48시간), 벤더 공지, Hacker News(24시간 100점 이상 26개)를 모두 받았고 조회 실패는 없습니다.
- 이상 없음으로 확인한 대상
  - 클라우드 (AWS): IAM, EC2, S3, CloudFront, ALB, ECR, ECS·EKS, Lambda, RDS·Aurora, ElastiCache, Cognito, Secrets Manager·KMS
  - AI·개발 도구: Claude Code, OpenAI Codex, Cursor, GitHub Copilot, Gemini CLI, VS Code, MCP 공식 SDK, Vercel AI SDK, LangChain.js, OpenAI·Anthropic SDK
  - 런타임·프레임워크: Node.js(undici 포함), TypeScript, React, Next.js, NestJS
  - 데이터베이스: PostgreSQL, MySQL·MariaDB, MongoDB(서버·Node.js 드라이버), Redis(Valkey 포함)
  - 공급망·CI/CD·인프라: npm 생태계(⑧ 외 신규 사고 없음), GitHub Actions, Docker
- KEV 신규 10건(모두 점검 대상 밖): Vates Xen Orchestra 인증 우회 CVE-2026-133469(기한 11월 28일), HPE Juniper Session Smart Router CVE-2026-103406, Mitel MiCollab 5건(CVE-2026-133323 외), Danfoss AK-SM 800A 3건(CVE-2025-41450 외) · [CISA KEV 목록](https://www.cisa.gov/known-exploited-vulnerabilities-catalog)
- 확인 실패: VS Code Marketplace·Open VSX (공식 공지 페이지가 없어 StepSecurity·Aikido·Wiz 글 목록으로만 확인, Socket 블로그는 날짜 표시 없음)
- 새 버전·새 공지 없음: AWS 이전 공지(2026-198 ~ 201), Claude Code(npm 최신 2.1.332, 권고 최신 10월 26일), OpenAI Codex(0.174.0 알파판만), Gemini CLI, Cursor(11월 6일 이후), VS Code 1.148(보안 수정 없음), Node.js 보안 릴리스(11월 11일 이후), OpenSSH 10.6p2(11월 5일), OpenSSL(11월 24일 QUIC Low 이후), nginx 1.30.8 / 1.31.10(11월 23일), PostgreSQL(11월 12일), Valkey(11월 19일 권고, 11월 21일 보고), Redis(5월 5일 이후), Kubernetes·Git(NVD 신규 없음)
- 그 밖의 권고: OSV npm 신규 GitHub 검토 권고는 `@waline/client` 저장형 XSS 1건(점검 대상 밖). `@nestjs/core` 12.6.1 / 12.6.2 / 11.2.12와 `@aws-sdk/client-s3` 3.1178.0은 보안 수정 없음.
- Hacker News: 미확인 보도 두 건 외에 점검 대상에 닿는 사고 글 없음. GitHub 서비스 품질 저하 글은 장애 공지.
- 후속 확인: 새로 올린 항목 없음. 열린 항목 `ruby2shell-poc-2026-11-25`(11월 28일까지)는 아침 기준 PoC 미공개라 그대로 둠. 발견자 페이지는 11월 21일 갱신 그대로.
