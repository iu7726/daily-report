# 보고서 사이트 (Next.js) — 기획서

> 상태: **구현·로컬 검증 완료 (2026-11-02)**. `web/`. lint·tsc·vitest(2 files 22건) 통과, 실제 보고서 3건으로 프로덕션 빌드(18개 경로 전부 정적), 보고서 0건·깨진 샘플 빌드도 통과(§7).
> 배포: `https://daily-report-ashy-nine.vercel.app` (2026-11-02, Root Directory `web`).
> 남은 것: 보고서 push 후 자동 재배포 확인(11-03 아침), 빌드 건너뛰기 확인, 검색엔진 등록(사용자). §7 미완 항목.
>
> 구현 변경점 (계획 대비):
> - **`cacheComponents`·`partialPrefetching`을 껐다.** create-next-app 16.4 기본값이 켜져 있는데, 켜면 `dynamicParams`를 쓸 수 없고 `generateStaticParams`가 빈 배열이면 빌드가 실패한다(A1과 충돌). 전부 빌드 시점 정적이라 이점도 없다. `next.config.ts`에 이유를 적었다.
> - **frontmatter는 `gray-matter` 대신 `yaml`(YAML 1.2) + 직접 분리.** gray-matter가 쓰는 js-yaml은 따옴표 없는 `date: 2026-11-02`를 `Date`(UTC 자정)로 바꾼다(A8). 테스트로 문자열 유지를 확인한다.
> - **선택 필드는 틀려도 파일을 버리지 않는다.** frontmatter가 없거나 YAML이 깨진 경우만 제외하고, `level`·`tags` 등이 틀리면 기본값을 쓴다(D5 세분화).
> - **루트 레이아웃에 canonical·og:url을 두지 않는다.** 두면 하위 페이지가 모두 홈을 대표 주소로 상속한다. `lib/seo.ts`의 `pageMetadata()`로 페이지마다 지정한다.
> - **캘린더 '오늘' 표시는 `useSyncExternalStore`.** effect 안 setState가 lint(react-hooks/set-state-in-effect)에 걸리고, 서버 결과(null)와 브라우저 결과를 분리할 수 있다.
> - **`@types/node`를 ^24로 올렸다.** create-next-app 기본 ^20이 vitest 5의 peer 범위와 맞지 않는다. 로컬 Node도 v24다.
> - **파비콘을 `app/icon.tsx`로 만들고** 템플릿 이미지(public/*.svg, favicon.ico)는 지웠다.
> - **`web/CLAUDE.md` 추가**: create-next-app이 만든 `AGENTS.md`(번들 문서를 먼저 읽으라는 규칙)를 Claude Code가 읽도록 `@AGENTS.md`로 불러온다.
> - **빌드 건너뛰기 비교 기준을 `VERCEL_GIT_PREVIOUS_SHA`로 (2026-11-02, 태그 작업 커밋 때)**: `HEAD^`만 비교하면 커밋 여러 개를 한 번에 push할 때 마지막 커밋만 보고 판단한다. 마지막이 기획서 수정뿐이면 앞의 사이트 변경까지 배포되지 않는다. 마지막 성공 배포 시점과 비교하고, 값이 없거나 얕은 clone이라 비교할 수 없으면(git 오류 = 0이 아닌 종료 코드) 빌드한다.
> - **빌드 건너뛰기 검사를 스크립트로 (v0.0.3)**: 커밋 메시지를 다시 쓰려고 force push하자 `VERCEL_GIT_PREVIOUS_SHA`(e44edf6)가 사라져 `git diff`가 `bad object`(종료 코드 128)로 끝났고, Vercel이 배포를 오류 처리했다(운영 사이트는 직전 성공 배포 유지). `web/scripts/vercel-ignore.sh`로 옮겨 기준 커밋이 없거나 오류가 나면 빌드(1), 변경이 없을 때만 건너뜀(0)으로 끝나게 했다.
> - **오늘 보고서 3건에 SEO 필드(`headline`, `description`, `tags`)를 직접 채웠다(§6-7).** 보고서가 "미확인 보도"로 분류한 항목(DeepSeek 코딩 에이전트, Cursor용 확장 백도어)은 headline·tags에서 뺐다.

## 0. TL;DR

- 루틴이 쌓는 `reports/<작업 ID>/YYYY-MM-DD.md`를 빌드할 때 읽어 정적 사이트로 만든다. 서버 런타임과 DB는 없다.
- 화면은 4개: 홈(최신 보고서 + 월 캘린더), 하루 모아보기, 작업별 목록, 보고서 상세.
- `web/` 폴더에 Next.js 16 + TypeScript + Tailwind 4를 둔다. Vercel Root Directory는 `web`.
- 검색 유입을 위해 루틴이 frontmatter에 SEO 필드(`headline`, `description`, `tags`)를 함께 뽑는다. 사이트는 이 값으로 메타 태그, OG 이미지, sitemap, RSS, 구조화 데이터를 만든다.
- 루틴이 보고서를 push할 때마다 Vercel이 자동으로 다시 빌드한다. `scheduler/`만 바뀐 커밋은 빌드를 건너뛴다.

## 1. 범위

**포함**

- 보고서 읽기, frontmatter 검증, 목록·캘린더·상세 화면
- SEO: 페이지별 메타 태그(제목, 설명, canonical, Open Graph, Twitter), OG 이미지, `sitemap.xml`, `robots.txt`, RSS(`/feed.xml`), 구조화 데이터(JSON-LD `Article`), 검색엔진 소유 확인 메타(Google, 네이버)
- 루틴 frontmatter에 SEO 필드 추가 (`scheduler/CLAUDE.md`)
- 면책 문구 (AI 자동 작성, 원문 확인 필요, 투자 권유 아님)
- 모바일 대응, 다크 모드
- Vercel 배포 설정 (Root Directory, 빌드 건너뛰기 조건)

**제외 (이후 후보)**

- 태그별 페이지 (태그는 상세 화면 표시와 메타 키워드에만 쓴다)
- 검색
- 로그인, 댓글
- 메일·푸시 알림 (푸시는 루틴 쪽에서 이미 보냄)

## 2. 현재 (사실 확인, 2026-11-02)

- 저장소: `scheduler/`(작업 3개 + 공통 규칙)만 있다. `reports/`는 아직 없다. 루틴 테스트 재실행 3건이 진행 중이다.
- 보고서 경로는 `reports/<작업 ID>/YYYY-MM-DD.md`이다. frontmatter는 `title`, `task`, `date`, `generated_at`, `level`, `summary` 6개다 (`scheduler/CLAUDE.md` '결과 저장').
- 작업 ID는 `ai-dev-briefing`, `sp500-morning-check`, `security-daily-report`이다.
- 본문 첫 줄은 `[YYYY-MM-DD 작업 제목]`, 둘째 줄은 `기준 시각: YYYY-MM-DD HH:mm KST`이다. 보안 리포트에는 GFM 표(상태표)가 있다.
- frontmatter의 `date: 2026-11-02`처럼 따옴표 없는 날짜는 YAML 1.1 파서(gray-matter가 쓰는 js-yaml)에서 `Date`(UTC 자정)로 바뀐다. D6과 같은 문제가 파싱 단계에서도 생긴다.
- 로컬 환경: Node v24.15.0, npm 11.12.1. Vercel CLI는 설치돼 있지 않다.
- npm 최신 버전 (2026-11-02 조회): next 16.4.3, react 19.3.1, tailwindcss 4.3.3, gray-matter 4.0.3, react-markdown 10.1.0, remark-gfm 4.0.1

## 3. 결정 사항

### 확정 (사용자 2026-11-02)

- **D1. 위치는 `web/`**: 루틴이 다루는 `scheduler/`, `reports/`와 사이트 코드를 분리한다. Vercel Root Directory를 `web`으로 두고, 보고서는 `../reports`에서 읽는다.
- **D2. 전부 정적 생성**: 모든 경로를 `generateStaticParams`로 만들고 `dynamicParams = false`로 둔다.
- **D3. 스택**: Next.js 16 App Router, TypeScript, Tailwind CSS 4, ESLint, npm
- **D4. md 처리**: 본문은 `react-markdown` + `remark-gfm`으로 렌더링한다. **원시 HTML은 렌더링하지 않는다(`rehype-raw` 미사용).** 보고서는 웹 자료를 바탕으로 AI가 쓴 글이라, HTML이 섞여 있어도 실행되지 않아야 한다.
- **D5. 형식이 깨진 보고서는 건너뛴다**: frontmatter가 없거나 YAML이 깨진 파일은 빌드 로그에 경고를 남기고 제외한다. 선택 필드가 틀린 경우에는 기본값으로 대신한다. 빌드를 실패시키면 루틴 하나가 형식을 틀렸을 때 사이트 전체의 갱신이 멈춘다.
- **D6. 날짜는 문자열로 다룬다**: 정렬과 비교는 `YYYY-MM-DD` 문자열로 하고, 요일 계산만 `Date.UTC`를 쓴다. frontmatter는 YAML 1.2 core 스키마(`yaml` 패키지)로 읽어 날짜가 `Date`로 바뀌지 않게 한다.
- **D7. '오늘'이 아니라 '최신'**: 홈은 가장 최근 날짜의 보고서를 보여 준다.
- **D8. 빌드 건너뛰기**: `web/vercel.json`의 `ignoreCommand`에 `git diff --quiet HEAD^ HEAD -- . ../reports`를 넣는다.
- **D9. 단위 테스트는 `lib/`만**: 파싱, 검증, 날짜, 캘린더 계산을 `vitest`로 테스트한다.
- **D10. 본문 첫 두 줄은 숨긴다 (Q1)**: `[YYYY-MM-DD 제목]` 줄과 `기준 시각:` 줄을 본문에서 빼고, 기준 시각은 상세 페이지 헤더에 표시한다.
- **D11. Vercel은 사용자가 배포 단계에서 만든다 (Q2)**: 그 전까지는 로컬 빌드로 검증한다.
- **D12. 디자인 톤 (Q3, 추천안)**: Vercel·Linear 계열의 미니멀 톤.
  - 무채색 바탕, 1px 테두리, 넉넉한 여백. 색은 `level` 상태에만 쓴다(긴급 빨강, 주의 노랑, 보통 회색).
  - 글꼴: 본문은 Pretendard Variable(동적 서브셋), 숫자·코드·CVE 번호는 Geist Mono
  - 한글 줄바꿈은 `word-break: keep-all`. 다크 모드는 시스템 설정을 따른다.
  - 목록은 최대 폭 960px, 본문은 720px
- **D13. SEO 필드는 루틴이 뽑는다**: `scheduler/CLAUDE.md` frontmatter에 아래 세 필드를 추가한다. 사이트에서는 선택 필드로 다루고, 없으면 기존 필드로 대신한다.
  - `headline`: 검색 결과 제목. 그날의 핵심(제품명, 버전, CVE 번호)을 앞에 둔 40자 안팎. 없으면 `title`
  - `description`: 검색 결과 설명. 80~150자. 없으면 `summary`
  - `tags`: 다룬 기술·제품·CVE 번호 3~8개. 없으면 빈 목록
- **D14. 사이트 주소**: `SITE_URL` 환경 변수 → Vercel이 주는 `VERCEL_PROJECT_PRODUCTION_URL` → `http://localhost:3000` 순서로 정한다. canonical, sitemap, RSS, OG의 절대 주소에 쓴다.
- **D15. 검색엔진 소유 확인**: `GOOGLE_SITE_VERIFICATION`, `NAVER_SITE_VERIFICATION` 환경 변수가 있으면 메타 태그로 넣는다. 국내 유입을 위해 네이버 서치어드바이저도 대상에 넣는다.
- **D16. OG 이미지**: 홈과 보고서 상세마다 빌드할 때 정적 이미지를 만든다(`next/og`). 보고서 이미지에는 작업 이름, 날짜, `headline`, `level`을 넣는다.

### 확인 필요

- **Q4. 사이트 이름**: 임시로 `Daily Report`. 바꾸려면 `web/lib/site.ts`의 상수만 고치면 된다.
- **Q5. 도메인**: Vercel 프로젝트를 만든 뒤 정한다. 정해지면 `SITE_URL`에 넣는다.

## 4. 구조

### 화면

| 경로 | 내용 |
|---|---|
| `/` | 가장 최근 날짜의 보고서 카드(작업 이름, `headline`, `summary`, `level` 배지), 그 아래 월 캘린더. 날짜마다 `level` 색 점을 찍고, 누르면 `/day/[date]`로 간다. 월 이동은 화면 안에서 처리한다. |
| `/day/[date]` | 그날 보고서 모아보기. 있는 작업만 보여 준다. 이전·다음 날 이동 |
| `/[task]` | 작업별 목록 (날짜 역순, `summary` 미리보기) |
| `/[task]/[date]` | 보고서 상세. 헤더(작업 이름, 날짜, 기준 시각, `level`, `headline`, `summary`, `tags`) + 본문 + 이전·다음 보고서 |

### SEO

| 대상 | 내용 |
|---|---|
| 페이지 제목 | 상세는 `{headline} — {작업 이름} {날짜} · {사이트 이름}`, 그 외는 화면 이름 · 사이트 이름 |
| 설명 | 상세는 `description`, 작업 목록은 작업 소개, 홈은 사이트 소개 |
| canonical | 페이지마다 절대 주소 |
| Open Graph / Twitter | 상세는 `type: article`, `publishedTime`, `tags` + OG 이미지 |
| JSON-LD | 상세에 `Article` (headline, description, datePublished, keywords, inLanguage `ko-KR`) |
| `sitemap.xml` | 홈, 작업 목록, 날짜 페이지, 보고서 상세. `lastModified`는 `generated_at` |
| `robots.txt` | 전체 허용 + sitemap 주소 |
| `/feed.xml` | 최근 보고서 50건의 RSS 2.0 |

### 폴더

```
web/
├── app/
│   ├── layout.tsx                # 공통 메타, 글꼴, 헤더·푸터
│   ├── page.tsx                  # 홈
│   ├── opengraph-image.tsx       # 홈 OG 이미지
│   ├── day/[date]/page.tsx
│   ├── [task]/page.tsx
│   ├── [task]/[date]/page.tsx
│   ├── [task]/[date]/opengraph-image.tsx
│   ├── sitemap.ts
│   ├── robots.ts
│   └── feed.xml/route.ts
├── components/
│   ├── Calendar.tsx              # 'use client', 월 이동
│   ├── ReportCard.tsx
│   ├── LevelBadge.tsx
│   └── Markdown.tsx              # react-markdown + remark-gfm, 링크·표 처리
├── lib/
│   ├── reports.ts                # 읽기, 검증, 정렬, 조회 함수
│   ├── tasks.ts                  # 작업 ID → 이름, 소개, 표시 순서
│   ├── date.ts                   # 문자열 날짜, 캘린더 계산
│   └── site.ts                   # 사이트 이름, 주소, 소개
└── vercel.json                   # ignoreCommand
```

### 데이터 흐름

1. `lib/reports.ts`가 빌드할 때 `path.join(process.cwd(), '..', 'reports')` 아래의 `*/*.md`를 읽는다.
2. frontmatter를 `yaml`(YAML 1.2)로 읽고 `zod`로 검증해 `Report[]`를 만든다. 작업 ID와 날짜는 경로에서 가져온다.
3. 본문 맨 앞의 제목 줄과 기준 시각 줄을 떼어 낸다(D10).
4. 페이지는 이 목록에서 필요한 것만 골라 쓴다. 홈 캘린더에는 날짜·작업·`level`만 담은 작은 목록을 넘긴다.

## 5. 케이스

**A. 데이터**

- A1. `reports/`가 없거나 비어 있음 → 빌드는 성공하고, 홈에 "아직 보고서가 없습니다"를 표시
- A2. frontmatter가 없거나 YAML이 깨짐 → 해당 파일을 제외하고 빌드 로그에 파일 경로와 이유를 경고 (D5)
- A3. `level`이 없거나 틀린 값 → `normal`로 취급
- A4. frontmatter `date`·`task`가 경로와 다름 → 경로를 기준으로 하고 경고
- A5. 모르는 작업 ID (작업 04 추가 등) → frontmatter `title`로 표시하고, 알려진 작업 뒤에 정렬
- A6. 하루에 일부 작업만 있음 → 있는 것만 표시. 캘린더 점도 있는 것만 찍음
- A7. 파일 이름이 `YYYY-MM-DD.md` 형식이 아님 → 제외하고 경고
- A8. 따옴표 없는 `date: 2026-11-02` → 문자열 그대로 읽힘 (D6)

**B. 날짜**

- B1. 정렬과 비교는 문자열로 한다.
- B2. 캘린더의 월 경계, 윤년, 월 첫날의 요일을 계산한다.

**C. 렌더링**

- C1. 본문에 원시 HTML이 있음 → 글자 그대로 보이고 실행되지 않음 (D4)
- C2. 외부 링크 → 새 탭으로 열고 `rel="noopener noreferrer"`를 붙임
- C3. 넓은 표(보안 상태표) → 표만 가로 스크롤. 페이지 전체에는 가로 스크롤이 생기지 않음 (모바일 폭 기준)
- C4. 다크 모드에서 배지와 표가 읽힘
- C5. 본문 첫 두 줄이 형식과 다름 → 떼어 내지 않고 그대로 표시

**S. SEO**

- S1. `headline`·`description`·`tags`가 없음 (SEO 필드 추가 전 보고서) → `title`·`summary`·빈 목록으로 대신 (D13)
- S2. `SITE_URL`이 없음 → Vercel 주소, 그것도 없으면 localhost (D14)
- S3. 소유 확인 환경 변수가 없음 → 해당 메타 태그를 넣지 않음

**R. 라우팅**

- R1. 없는 작업이나 날짜 → 404
- R2. `/day/...`와 `/[task]`가 겹침 → 정적 경로가 우선한다. `day`를 작업 ID로 쓰지 않도록 `scheduler/README.md`에 적어 둔다.

## 6. 작업 순서

1. `scheduler/CLAUDE.md` frontmatter에 SEO 필드 추가 (D13). `scheduler/README.md`에 예약 경로 안내 추가 (R2)
2. `web/`에 create-next-app 실행 (TypeScript, App Router, Tailwind, ESLint, npm)
3. 의존성 추가: `yaml`, `zod`, `react-markdown`, `remark-gfm`, `pretendard`, `@tailwindcss/typography`, 개발용 `vitest`
4. `lib/` 작성과 단위 테스트 (A, B, C5, S1). 테스트용 샘플은 `web/lib/__fixtures__/`에 둔다.
5. 컴포넌트, 페이지 4개, SEO 파일
6. 로컬 확인: 실제 보고서(테스트 실행 결과)로 `npm run build`, `npm run dev`
7. 오늘 보고서 3개의 frontmatter를 새 형식으로 보정 (`level`, 평문 `title`, SEO 필드)
8. Vercel 연결 (사용자): Root Directory `web`, `SITE_URL` 등 환경 변수
9. 배포 확인: 보고서 push → 자동 재배포 → 새 보고서 노출

## 7. 검증 (2026-11-02, 로컬)

- [x] `npm run lint` 통과, `npx tsc --noEmit` 통과, `npm test` 2 files 22건 통과 (A1~A8, B1~B2, C5, S1, D10)
- [x] `npm run build`
  - 실제 보고서 3건: 18개 경로 전부 정적(○/●)
  - `REPORTS_DIR=/tmp/__no_reports__` (0건): 빌드 성공, 작업 목록 3개만 생성 (A1)
  - `REPORTS_DIR=lib/__fixtures__/reports` (깨진 샘플): 빌드 성공, `[reports]` 경고 8줄 출력 (A2~A7)
- [x] `next start` 응답: `/`, 작업 목록, 상세, 날짜, `feed.xml`, `sitemap.xml`, `robots.txt`, OG 이미지 2종, `icon` 모두 200. 없는 경로(`/nope`, 없는 날짜의 상세·날짜 페이지) 404 (R1)
- [x] 상세 페이지 head: title(headline 포함), description, canonical, `og:type=article`, `article:published_time`·`article:tag`, keywords, RSS alternate, twitter card, JSON-LD 1개. H1 1개
- [x] 본문 첫 줄 `[날짜 제목]`은 빠지고 기준 시각은 헤더에 표시 (D10). `<script>`는 실행되지 않고 글자로 남음 (C1)
- [x] 화면: headless Chrome 스크린샷으로 홈·상세(1280px), 상세·홈(390px, iframe), OG 이미지 확인. 390px에서 가로 스크롤 없음 (C3). 모바일 메타 줄의 `·`만 줄 끝에 남던 문제 수정
- [x] 라이트 모드 화면 확인 (`--blink-settings=preferredColorScheme=1`). 태그와 본문 첫 제목 사이 여백이 과해 본문 첫 요소의 위 여백을 0으로 수정
- [x] Vercel 배포 (2026-11-02, `https://daily-report-ashy-nine.vercel.app`): 17개 경로 200, 없는 경로 404, `x-vercel-cache: HIT`(정적). 글꼴·화면 로컬과 같음
- [x] `SITE_URL` 없이 `VERCEL_PROJECT_PRODUCTION_URL`로 canonical·og:url·OG 이미지·JSON-LD·sitemap·robots·RSS 절대 주소가 운영 주소로 나옴 (S2)
- [x] 보고서 push 후 자동 재배포 (2026-11-02 루틴 재실행): 운영 사이트 제목이 재실행본 headline으로 바뀜
- [x] 빌드 건너뛰기 스크립트 로컬 검사: 기준 없음·사라진 커밋 → 1(빌드), 문서만 변경 → 0(건너뜀), web/·reports/ 변경 → 1
- [ ] Vercel에서 확인 (사용자): v0.0.3 배포가 Ready(로그 "기준 커밋…을 찾을 수 없어 빌드합니다"), 그다음 문서만 바뀐 병합 배포는 Ignored
- [ ] Google Search Console·네이버 서치어드바이저 등록 (사용자): 소유 확인 값을 환경 변수로 넣고 sitemap·RSS 제출
