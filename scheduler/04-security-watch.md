# IT 보안 후속 확인

- 작업 ID: `security-watch`
- 유형: 조건부 알림형
- 일정: 3시간마다 15분 (KST 00:15·03:15·06:15·09:15·12:15·15:15·18:15·21:15, Cron UTC `15 */3 * * *`)

## 실행 프롬프트

아침 보안 리포트가 "곧 나올 예정"으로 남겨 둔 항목이 실제로 나왔는지 확인하는 작업이야. 대부분의 회차는 확인할 것이 없거나 아직 나오지 않은 상태야. 그럴 때는 아무것도 바꾸지 말고 바로 끝내.

공통 규칙의 '정확성'과 '글쓰기'는 따르고, '결과 저장'의 1~3단계(이전 보고 확인, 새 보고서 파일, frontmatter 작성)는 적용하지 마. 커밋·push·알림은 아래 절차대로 해.

### 1. 대기 목록 읽기

`watch/watchlist.json`을 읽어. 파일이 없거나 `status`가 `open`인 항목이 없으면 **커밋도 알림도 하지 말고 끝내.**

### 2. 열린 항목 확인

- 실행 시각(KST) 기준으로 `until` 날짜가 지났으면 `status`를 `expired`로 바꾸고 넘어가. 알림은 보내지 마.
- `sources`의 원문을 열어 `check`에 적힌 조건이 충족됐는지 확인해. 공식 원문으로 확인되지 않으면 충족되지 않은 것으로 봐.
- 원문에 접속하지 못하면 그 항목은 이번 회차를 건너뛰어(상태는 그대로).

### 3. 충족된 항목 처리

1. 가장 최근 보안 리포트(`reports/security-daily-report/YYYY/MM/DD.md` 중 날짜가 가장 늦은 것)의 본문에서 `기준 시각:` 줄 바로 다음에 아래 절을 넣어. 같은 항목의 후속 확인 절이 이미 있으면 넣지 마.

   ```markdown
   ## 후속 확인 (MM-DD HH:mm KST) — <항목 제목>

   <무엇이 나왔는지 2~3문장. 영향 버전, 수정 버전, 심각도처럼 확인된 값>

   - 조치: <해야 할 일 1~3개>
   - 원문: <링크> (공개 YYYY-MM-DD HH:mm KST)
   ```

   frontmatter는 바꾸지 마. 단, 새로 확인된 내용이 P1(실제 악용, CISA KEV, 인증 없는 원격 코드 실행)이면 `level`만 `urgent`로 올려.
2. 항목의 `status`를 `done`으로 바꾸고 `done_at`(KST, 예: `2026-11-04T03:15:00+09:00`)과 `result`(한 줄 요약)를 채워.

### 4. 커밋·알림

- 바뀐 것이 없으면(모두 아직이거나 건너뜀) 커밋하지 말고 끝내.
- 바뀐 것이 있으면 `watch/watchlist.json`과 수정한 리포트만 `git add`해서 `report(security-watch): YYYY-MM-DD HH:mm 후속 확인` 메시지로 커밋하고 `main`에 push해. 거부되면 `git pull --rebase origin main` 후 다시 push해.
- 충족된 항목이 있을 때만 푸시 알림(PushNotification)을 보내: `[보안 후속 확인] <항목 제목> · <한 줄 요약>`. 기한 만료만 있었으면 알림은 보내지 마.

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
  ]
}
```

- `id`: 영문 소문자와 `-`. 같은 대상을 두 번 올리지 않는 기준이야.
- `report`: 이 항목을 올린 리포트. 후속 확인 절은 이 리포트가 아니라 가장 최근 리포트에 넣어(사람들은 최신 리포트를 보니까).
- `until`: 이 날짜(KST)가 지나면 확인을 멈춰. 최대 등록일 + 7일.
- 끝난 항목(`done`, `expired`)은 기록으로 남겨. 끝난 지 30일이 지난 항목은 지워도 돼.
