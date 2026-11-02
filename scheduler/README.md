# scheduler

매일 아침 받아보는 보고서용 예약 작업 프롬프트 모음. Claude 클라우드 루틴이 이 폴더의 파일을 읽고 실행한다.

| 파일 | 작업 ID | 작업 | 일정 (KST) |
|---|---|---|---|
| `CLAUDE.md` | - | 공통 실행 규칙 (모든 작업에 적용) | - |
| `01-ai-dev-briefing.md` | `ai-dev-briefing` | AI·개발 도구 브리핑 | 매일 08:30 |
| `02-sp500-morning-check.md` | `sp500-morning-check` | S&P500 실적·금리 아침 점검 | 매일 09:00 |
| `03-security-daily-report.md` | `security-daily-report` | IT 보안 이슈 데일리 리포트 | 매일 09:30 |

## 동작 방식

1. 정해진 시각에 Claude 루틴이 클라우드에서 이 저장소를 받아 실행한다.
2. 루틴은 `scheduler/CLAUDE.md`와 해당 작업 파일을 읽고 웹을 조사해 보고서를 쓴다.
3. 보고서를 `reports/<작업 ID>/YYYY-MM-DD.md`로 저장해 `main`에 push한다. 파일 앞의 frontmatter(`title`, `task`, `date`, `generated_at`, `level`, `summary`)는 사이트에서 목록과 캘린더를 만드는 데 쓴다. 필드 정의는 `CLAUDE.md`의 '결과 저장'에 있다.

프롬프트는 이 폴더의 파일을 고쳐 push하면 다음 실행부터 반영된다. 루틴 설정은 따로 바꿀 필요가 없다.

루틴 관리: https://claude.ai/code/routines

## 루틴 설정

| 루틴 | Cron (UTC) | KST |
|---|---|---|
| AI·개발 도구 브리핑 | `30 23 * * *` | 매일 08:30 |
| S&P500 실적·금리 아침 점검 | `0 0 * * *` | 매일 09:00 |
| IT 보안 이슈 데일리 리포트 | `30 0 * * *` | 매일 09:30 |

- 모델: Opus 5.5
- 도구: Bash, Read, Write, Edit, Glob, Grep, WebSearch, WebFetch
- 루틴 프롬프트 (작업 파일 이름만 바꿔 쓴다):

  ```text
  이 저장소의 scheduler/CLAUDE.md(공통 실행 규칙)를 먼저 읽고, scheduler/01-ai-dev-briefing.md 작업을 실행해. 결과는 공통 규칙의 '결과 저장' 절차대로 저장하고 main 브랜치에 push해.
  ```

## 작업 추가하기

1. `04-<이름>.md` 파일을 만들고 기존 작업 파일처럼 제목, `작업 ID`, `유형`(보고서형 / 조건부 알림형), `일정`, `실행 프롬프트`를 적는다.
   - 작업 ID는 영문 소문자와 `-`만 쓴다. 사이트 경로와 겹치는 `day`, `feed.xml`, `sitemap.xml`, `robots.txt`는 쓰지 않는다.
2. 위 두 표에 한 줄씩 추가하고, 같은 형식으로 루틴을 하나 더 만든다. 루틴 Cron은 UTC 기준이므로 KST에서 9시간을 뺀다.
3. 사이트에 이름과 소개를 표시하려면 `web/lib/tasks.ts`에도 추가한다. 추가하지 않아도 frontmatter `title`로 표시된다.
