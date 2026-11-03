# scheduler

매일 아침 받아보는 보고서용 예약 작업 프롬프트 모음. Claude 클라우드 루틴이 이 폴더의 파일을 읽고 실행한다.

| 파일 | 작업 ID | 작업 | 일정 (KST) |
|---|---|---|---|
| `CLAUDE.md` | - | 공통 실행 규칙 (모든 작업에 적용) | - |
| `03-security-daily-report.md` | `security-daily-report` | IT 보안 이슈 데일리 리포트 | 매일 08:25 |
| `01-ai-dev-briefing.md` | `ai-dev-briefing` | AI·개발 도구 브리핑 | 매일 08:42 |
| `02-sp500-morning-check.md` | `sp500-morning-check` | S&P500 실적·금리 아침 점검 | 매일 08:55 |
| `04-security-watch.md` | `security-watch` | IT 보안 후속 확인 (조건부 알림형) | 3시간마다 15분 |

실행 순서는 보안 → AI → S&P500이다. 파일 번호는 루틴 프롬프트가 파일 이름을 가리키고 있어 처음 만든 순서 그대로 둔다. 서버가 예정 시각보다 몇 분(8~9분) 늦게 시작할 수 있다.

## 동작 방식

1. 정해진 시각에 Claude 루틴이 클라우드에서 이 저장소를 받아 실행한다.
2. 루틴은 `scheduler/CLAUDE.md`와 해당 작업 파일을 읽고 웹을 조사해 보고서를 쓴다.
3. 보고서를 `reports/<작업 ID>/YYYY/MM/DD.md`로 저장해 `main`에 push한다. 파일 앞의 frontmatter(`title`, `task`, `date`, `generated_at`, `level`, `summary`)는 사이트에서 목록과 캘린더를 만드는 데 쓴다. 필드 정의는 `CLAUDE.md`의 '결과 저장'에 있다.

프롬프트는 이 폴더의 파일을 고쳐 push하면 다음 실행부터 반영된다. 루틴 설정은 따로 바꿀 필요가 없다.

루틴 관리: https://claude.ai/code/routines

## 루틴 설정

| 루틴 | Cron (UTC) | KST |
|---|---|---|
| IT 보안 이슈 데일리 리포트 | `25 23 * * *` | 매일 08:25 |
| AI·개발 도구 브리핑 | `42 23 * * *` | 매일 08:42 |
| S&P500 실적·금리 아침 점검 | `55 23 * * *` | 매일 08:55 |
| IT 보안 후속 확인 | `15 */3 * * *` | 00:15부터 3시간마다 |

- 모델: Opus 5.5 (후속 확인은 Sonnet 5.5. 원문에 나왔는지 확인하는 일이고 자주 돈다)
- 도구: Bash, Read, Write, Edit, Glob, Grep, WebSearch, WebFetch
- 루틴 프롬프트 (작업 파일 이름만 바꿔 쓴다):

  ```text
  이 저장소의 scheduler/CLAUDE.md(공통 실행 규칙)를 먼저 읽고, scheduler/01-ai-dev-briefing.md 작업을 실행해. 결과는 공통 규칙의 '결과 저장' 절차대로 저장하고 main 브랜치에 push해.
  ```

## 보안 후속 확인

아침 보안 리포트는 그 시점까지만 볼 수 있다. "오늘 미국 시간에 보안 릴리스 예정"처럼 언제 나올지 정해진 것은 보안 루틴이 `watch/watchlist.json`에 올리고, 후속 확인 루틴이 3시간마다 원문을 확인한다.

- 열린 항목이 없으면 바로 끝난다(커밋·알림 없음).
- 나왔으면 가장 최근 보안 리포트에 "후속 확인" 절을 넣고 휴대폰으로 알린다. 사이트도 다시 배포된다.
- 기한(최대 7일)이 지나면 확인을 멈춘다. 형식은 `04-security-watch.md`의 '대기 목록 형식'에 있다.

## 작업 추가하기

1. `05-<이름>.md` 파일을 만들고 기존 작업 파일처럼 제목, `작업 ID`, `유형`(보고서형 / 조건부 알림형), `일정`, `실행 프롬프트`를 적는다.
   - 작업 ID는 영문 소문자와 `-`만 쓴다. 사이트 경로와 겹치는 `day`, `tags`, `feed.xml`, `sitemap.xml`, `robots.txt`는 쓰지 않는다.
2. 위 두 표에 한 줄씩 추가하고, 같은 형식으로 루틴을 하나 더 만든다. 루틴 Cron은 UTC 기준이므로 KST에서 9시간을 뺀다.
3. 사이트에 이름과 소개를 표시하려면 `web/lib/tasks.ts`에도 추가한다. 추가하지 않아도 frontmatter `title`로 표시된다.
