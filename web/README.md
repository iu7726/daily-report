# web

`../reports`의 보고서(md)를 빌드할 때 읽어 정적 사이트로 만드는 Next.js 앱.

## 명령

```sh
npm run dev     # 개발 서버
npm run build   # 프로덕션 빌드 (모든 페이지 정적 생성)
npm run lint
npm test        # lib/ 단위 테스트 (vitest)
```

## 환경 변수

`.env.example` 참고. 모두 선택이다.

| 이름 | 용도 |
|---|---|
| `SITE_URL` | canonical, sitemap, RSS, OG의 절대 주소. 없으면 Vercel 운영 주소 → localhost |
| `GOOGLE_SITE_VERIFICATION` | Google Search Console 소유 확인 메타 태그 |
| `NAVER_SITE_VERIFICATION` | 네이버 서치어드바이저 소유 확인 메타 태그 |
| `REPORTS_DIR` | 보고서 폴더 위치. 없으면 `../reports` |

## 구조

| 경로 | 내용 |
|---|---|
| `app/page.tsx` | 홈: 최신 보고서, 월 캘린더, 브리핑 종류 |
| `app/day/[date]` | 하루 모아보기 |
| `app/[task]` | 작업별 목록 |
| `app/[task]/[date]` | 보고서 상세 + OG 이미지 |
| `app/sitemap.ts`, `app/robots.ts`, `app/feed.xml` | SEO, RSS |
| `lib/reports.ts` | 보고서 읽기·검증·조회 |
| `lib/date.ts` | 문자열 날짜, 달력 계산 |
| `lib/tasks.ts` | 작업 이름·소개·표시 순서 |
| `lib/site.ts` | 사이트 이름·주소 |

보고서 frontmatter 형식은 `../scheduler/CLAUDE.md`의 '결과 저장'에 있다.

## Vercel

- Root Directory: `web`
- "Include files outside the Root Directory in the Build Step"을 켜 둔다(기본값). `../reports`를 읽어야 한다.
- `vercel.json`의 `ignoreCommand`가 `web/`이나 `reports/`가 바뀌지 않은 커밋의 빌드를 건너뛴다.
