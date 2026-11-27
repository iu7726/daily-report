# 보안 리포트 언어 범위 확대 (Java·Python) — 기획서

> 상태: **구현 중 (2026-11-27)**
> 남은 것: 배포 다음 날 아침 보안 리포트 확인, 루틴 환경의 pypistats 조회 확인

## 0. TL;DR

보안 리포트는 "언어는 Node.js·TypeScript만 본다"는 규칙 때문에 화제가 된 Java·Python 사건을 한 줄로 넘기거나 다루지 않았다. 11월 18일 Hacker News 상위권에 오른 Java4Shell(CVE-2026-114938)이 그랬다.

두 가지를 바꾼다. 화제가 되거나 실제로 악용되는 큰 사건은 언어와 관계없이 다룬다. Java와 Python의 주요 런타임·프레임워크·공급망은 점검 대상의 '추가'로 넣고, OSV의 Maven·PyPI 목록과 NVD 스캔 대상 제품을 넓힌다. 새벽 긴급 감시(04)도 같은 범위로 넓힌다. 본문이 다시 길어지지 않게 Java·Python의 P3는 조사 기록에 이름만 남긴다.

## 1. 범위

- 포함
  - 03의 언어 규칙, 점검 대상 표, 조사 절차(OSV 목록, NVD 스캔, Hacker News 대조), 우선 참조 출처
  - 04의 감시 대상(KEV 핵심 제품, OSV 목록, 핵심 패키지)
  - `scheduler/scripts/nvd_scan.py`의 대상 제품 이름
  - README와 사이트의 보안 리포트 소개 문구
- 제외
  - Go, Rust, .NET, PHP, Ruby 같은 다른 언어의 정기 점검: 화제성 기준(R1)에 해당할 때만 다룬다.
  - `security-check` 스킬: 지금처럼 Node.js lockfile만 본다. Java·Python 프로젝트 점검은 따로 정한다.
  - 보고서 골격과 분량 상한: 보고서 문체 기획서(2026-11-27_report-writing)를 그대로 따른다.

## 2. 현재 (사실 확인, 2026-11-27)

### 언어 규칙

03 '점검 대상' 끝에 "언어는 Node.js·TypeScript만 본다."가 있다. 04에는 언어 규칙이 없지만 감시 목록이 npm·GitHub Actions(OSV)와 NVD 대상 제품뿐이라, Java·Python 권고는 MongoDB처럼 제품 이름이 걸린 경우에만 들어온다.

### 빠진 사건 (11월)

| 날짜 | 사건 | 보고서 처리 |
|---|---|---|
| 11-17 | Amazon Deep Java Library 임의 파일 읽기 (CVE-2026-129266) | AWS 공지라 P3 한 줄, "점검 대상 밖" 표시 |
| 11-18 | Java4Shell: OpenJDK Base64 디코더 원격 코드 실행 (CVE-2026-114938) | Hacker News 대조 문단에서 "Node.js·TypeScript 점검 범위 밖"으로 언급만 |
| 11-19 | Microsoft `agent-framework` PyPI 패키지 탈취 (보안 업체 보도) | "Python 패키지라 점검 범위 밖" 한 줄 |
| 11-20 | Amazon Corretto의 Java4Shell 수정판 | AWS 공지라 P3 한 줄 |
| 11-24 | pgjdbc CVE 8건, Spring Data Elasticsearch SpEL 주입 (CVE-2026-123886) | "Java 라이브러리라 점검 범위 밖" 한 줄 |

AWS 공지와 KEV에 오른 것은 언어와 관계없이 한 줄씩 남았다(예: 11-19 LiteLLM KEV 등재). 화제가 된 Java4Shell은 이틀 뒤 AWS 공지를 통해 P3 한 줄로 다룬 것이 전부였다.

### OSV 목록 크기 (2026-11-27 측정)

| 생태계 | 최근 1일 수정 | 최근 7일 수정 |
|---|---|---|
| Maven | 3건 (GHSA 3) | 8건 (GHSA 8) |
| PyPI | 12건 (GHSA 2, MAL 10) | 78건 (GHSA 24, MAL 38) |
| npm (지금 보는 목록) | 53건 (GHSA 5, MAL 48) | 1,604건 (GHSA 20, MAL 1,583) |

Maven·PyPI 목록도 npm과 같은 형식(`<수정 시각>,<ID>`, 최근 수정순)이라 같은 방법으로 날짜를 거를 수 있다. 상세(`api.osv.dev/v1/vulns/<ID>`)는 `Maven` / `org.apache.tomcat:tomcat-coyote`처럼 생태계와 패키지 이름, 심각도를 준다. 수정 시각이 최근이어도 공개(`published`)는 오래된 권고가 섞여 있어 npm처럼 공개일을 함께 봐야 한다.

### 조회 스크립트

- `nvd_scan.py`는 설명 키워드(`DESC_KEYWORDS`)와 CVE.org 영향 제품(`TARGET_PRODUCTS`)으로 대상 제품을 고른다. 이름 목록에 Java·Python 제품이 없다.
- `hn_top.py`는 100점 이상 글을 모두 보여 준다. 03은 그중 "점검 대상에 닿는데 위에서 못 찾은 사건"만 1차 자료로 확인해 다룬다.
- PyPI 주간 다운로드는 `https://pypistats.org/api/packages/<패키지>/recent`로 조회된다(이 컴퓨터에서 확인, 루틴 환경은 미확인). Maven은 공개된 다운로드 수가 없다.
- 사이트의 보안 리포트 소개(`web/lib/tasks.ts`)와 README는 분야만 적고 언어는 적지 않았다.

## 3. 결정 사항

### 확정 (사용자 2026-11-27)

- D1. 언어 범위를 좁히지 않고 넓힌다. "자바 잠깐 핫했는데 안 잡히는 게 아쉬웠다"(Java4Shell).
- D2. 사용자가 퇴근하며 끝까지 작업해 main까지 병합하라고 했다. 아래 확인 필요 항목은 추천안대로 정했다.
  - Q1 → Python도 Java와 같은 기준으로 넣는다.
  - Q2 → Java·Python P3는 조사 기록에 둔다.
  - Q3 → 작업 파일에 "다운로드 수를 조회하지 못하면 핵심 패키지만 본다"를 적어, 루틴 환경에서 pypistats가 막혀도 동작하게 했다.

### 구현 방향

- R1. **화제성 기준**: 아래 중 하나에 해당하면 언어와 관계없이 '주요 항목'으로 다룬다. 우선순위는 03의 기준을 그대로 쓴다.
  - CISA KEV에 새로 오른 것 중 개발자가 쓰는 런타임·프레임워크·패키지·개발 도구(예: OpenJDK, LiteLLM). 네트워크 장비, OS, 업무용 앱은 지금처럼 조사 기록에 한 줄 남긴다.
  - 실제 악용이 확인된 원격 코드 실행
  - Hacker News 대조(100점 이상)에 오른 취약점·공격 사건 중 1차 자료(벤더 공지, CVE, 보안 권고)로 확인되는 것
  - 널리 쓰이는 패키지의 탈취나 악성 버전 배포. npm은 지금처럼 주간 다운로드 10만 이상, PyPI도 같은 기준이고, Maven은 R5의 핵심 패키지만 본다.
- R2. **Java·Python 추가 대상**: 03 점검 대상 표의 '추가' 칸에 넣는다. 분야는 지금처럼 영향받는 소프트웨어로 정한다.

  | 분야 | 더하는 대상 |
  |---|---|
  | 런타임·프레임워크 | Java(OpenJDK, Oracle Java SE, Amazon Corretto), Spring(Framework, Boot, Security), Apache Tomcat, Log4j, Jackson, Netty, Python(CPython), Django, FastAPI, Flask |
  | 데이터베이스 | JDBC 드라이버(pgjdbc, MySQL Connector/J), Hibernate, Python DB 드라이버(psycopg, PyMongo), SQLAlchemy |
  | AI·개발 도구 | Python AI 라이브러리(LangChain, LlamaIndex, LiteLLM, vLLM, transformers), MCP Python SDK |
  | 공급망·CI/CD·인프라 | Maven Central과 PyPI 공급망(인기 패키지 탈취, 악성 패키지) |

- R3. **본문 분량**: R2 대상은 P1·P2이거나 R1에 해당할 때만 '주요 항목'에 쓴다. P3는 '참고'에 쓰지 않고 조사 기록에 `Java·Python P3: <이름> (<식별번호>)` 한 줄로 모은다. Node.js 스택의 P3는 지금처럼 '참고'에 쓴다.
- R4. **03 조사 절차**
  - 2번(OSV): Maven·PyPI 목록을 더한다. GHSA는 R2 대상이거나 R1에 해당하는 것만 상세를 연다. MAL은 R2 패키지를 사칭하거나 인기 패키지를 탈취한 것만 다룬다.
  - 5번(NVD): 스캔 대상 제품에 Java·Python 이름을 더한다(R6).
  - 8번(Hacker News): "점검 대상에 닿는데 못 찾은 사건"을 "취약점·공격 사건이면 언어와 관계없이"(R1)로 바꾼다.
  - 우선 참조 출처에 Oracle Critical Patch Update(Java SE), Spring 보안 권고, Apache Tomcat 보안 페이지, Log4j 보안 페이지, Python 보안 공지(PSF), Django 보안 릴리스를 더한다.
- R5. **04 긴급 감시**
  - KEV 핵심 제품에 Java(OpenJDK, Oracle Java SE), Spring, Apache Tomcat, Log4j, Python(CPython)을 더한다.
  - OSV에 Maven·PyPI 목록을 더한다. 알릴 것 ①은 CRITICAL GHSA 중 핵심 패키지이거나 주간 다운로드 100만 이상인 PyPI 패키지, ②는 주간 다운로드 10만 이상 PyPI 패키지의 악성 버전이다.
  - 핵심 Maven 패키지: `org.springframework:*`, `org.springframework.boot:*`, `org.springframework.security:*`, `org.apache.tomcat.embed:tomcat-embed-core`, `org.apache.logging.log4j:log4j-core`, `com.fasterxml.jackson.core:jackson-databind`, `io.netty:*`
  - 핵심 PyPI 패키지: `django`, `fastapi`, `flask`, `requests`, `urllib3`, `langchain`, `langchain-*`, `litellm`, `mcp`
- R6. **`nvd_scan.py`**: 설명 키워드와 대상 제품에 openjdk, java se, corretto, spring, tomcat, log4j, jackson, netty, cpython, django, fastapi, flask, urllib3를 더한다. "java", "python"처럼 넓은 단어는 넣지 않는다. 설명에 언어 이름만 나오는 CVE가 많아서다.
- R7. **태그 표기**: `OpenJDK`, `Spring Framework`, `Apache Tomcat`, `Log4j`, `Jackson`, `Python`, `Django`, `PyPI`, `Maven`을 쓴다.

### 확인 필요 (D2로 정함)

- Q1. Python도 Java와 같은 기준으로 넣을지. 11월 19일 `agent-framework` PyPI 탈취가 범위 밖으로 빠진 것이 근거다.
- Q2. Java·Python P3를 본문 '참고' 대신 조사 기록에 둘지(R3)
- Q3. PyPI 다운로드 조회(pypistats.org)가 루틴 환경에서 되는지

## 4. 구조

| 파일 | 바뀌는 것 |
|---|---|
| `scheduler/03-security-daily-report.md` | 언어 규칙(R1), 점검 대상 표의 '추가'(R2), 조사 절차 2·5·8번(R4), '참고'와 '조사 기록' 규칙(R3), 우선 참조 출처 |
| `scheduler/04-security-watch.md` | KEV 핵심 제품, OSV 목록과 알릴 기준, 핵심 패키지 표(R5) |
| `scheduler/scripts/nvd_scan.py` | 대상 제품 이름(R6) |
| `scheduler/README.md`, `README.md`, `web/lib/tasks.ts` | 보안 리포트 범위 설명에 "Java·Python 주요 프레임워크, 화제가 된 사건" 추가 |

## 5. 케이스

- C1. Java4Shell처럼 Hacker News 상위권에 오르고 CVE가 있는 사건: 언어와 관계없이 주요 항목으로 쓴다. 영향 범위 문단 첫머리에 "Java 서비스를 운영하는 경우만 해당합니다"처럼 밝힌다.
- C2. Spring Boot의 P2 권고: 주요 항목으로 쓴다(R2·R3).
- C3. pgjdbc의 P3 권고 여러 건: 조사 기록에 한 줄로 쓴다.
- C4. 인기 PyPI 패키지 탈취(11-19 `agent-framework` 같은 경우): R1에 따라 주요 항목으로 쓰고, 새벽이면 긴급 감시가 알린다.
- C5. KEV에 오른 Python AI 게이트웨이(11-19 LiteLLM 같은 경우): R1에 따라 주요 항목으로 쓴다.
- C6. Go·Rust 라이브러리의 Critical 권고, 화제가 되지 않음: 다루지 않는다.
- C7. NVD 스캔에 Java·Python 제품이 20건 넘게 나옴: P1·P2만 항목으로 쓰고 나머지는 조사 기록에 건수로 쓴다.
- C8. 새벽 긴급 감시가 Spring CRITICAL 권고를 알림: 다음 날 아침 리포트가 '긴급 감시·후속 확인 다시 쓰기'대로 다시 설명한다.
- C9. 분량 상한을 넘음: Java·Python P3는 이미 조사 기록에 있으므로, Node.js 스택의 P3부터 한 문장으로 줄인다.

## 6. 작업 순서

1. 기획서 사용자 확인
2. `nvd_scan.py`에 대상 제품 이름 추가
3. `nvd_scan.py`를 11월 17일부터 실행해 Java4Shell, pgjdbc, Spring Data Elasticsearch CVE가 대상 제품으로 나오는지 확인
4. `scheduler/03-security-daily-report.md` 수정
5. `scheduler/04-security-watch.md` 수정
6. README, `scheduler/README.md`, `web/lib/tasks.ts`의 소개 문구 수정
7. 기획서 상태와 검증 결과 갱신
8. 커밋(사용자 요청 시)
9. 배포 다음 날 아침 보안 리포트 확인

## 7. 검증

- [ ] `nvd_scan.py`: 11월 17일 이후 구간에서 CVE-2026-114938(Java4Shell), CVE-2026-123886(Spring Data Elasticsearch), pgjdbc CVE가 '대상 제품'으로 나온다.
- [ ] OSV Maven·PyPI 목록과 상세 조회가 루틴과 같은 명령으로 동작한다.
- [ ] 첫 아침 실행: Java·Python 항목이 R1·R3대로 들어가고, 보고서가 분량 검사를 통과한다.
- [ ] 루틴 환경의 pypistats 조회 가능 여부(Q3)
