# 구글 검색 결과의 사이트 이름·아이콘 — 기획서

> 상태: **구현·검증 완료 (2026-11-04)**. 배포 `v0.0.13`
> 남은 것: Search Console 색인 요청(사용자), 며칠 ~ 몇 주 뒤 구글 검색 결과 확인

## 0. TL;DR

구글 검색 결과에 사이트 이름이 "Vercel"로, 아이콘이 기본 지구본으로 나온다. 이름은 구글이 "Daily Report"를 흔한 이름으로 보고 확신하지 못해 상위 도메인(vercel.app)의 이름을 쓴 것으로 보인다. WebSite 구조화 데이터에 구글이 권하는 대체 이름(소문자 서브도메인)을 넣고, 아이콘을 32px에서 192px로 키우고 Apple 아이콘을 더한다. 반영은 구글이 다시 수집한 뒤라 며칠에서 몇 주 걸린다.

## 1. 범위

- 포함: 홈 WebSite 구조화 데이터의 `alternateName`, 사이트 아이콘 크기, `apple-icon`
- 제외
  - 사이트 이름 자체 바꾸기(11-03에 "Daily Report" 유지로 정함, U1)
  - 사이트 주소(`daily-report-ashy-nine.vercel.app`) 바꾸기. Vercel 프로젝트 도메인, 루틴, Search Console을 같이 바꿔야 하는 별도 작업이다.
  - 검색 결과 오른쪽 썸네일. 구글이 페이지 내용을 보고 정하며 직접 지정할 수 없다.

## 2. 현재 (2026-11-04)

- 구글 검색 결과(사용자 캡처): 이름 "Vercel", 지구본 아이콘, 제목 "Daily Report — 매일 아침, AI가 정리하는 개발·시장·보안 브리핑", 설명 끝 "최신 브리핑 2026년 11월 2일 (월)". 제목과 설명이 옛 문구(11-03 순서 변경 전)라 11-02 무렵 수집본이다.
- 실제 홈 HTML
  - `<title>`과 `og:site_name`, WebSite 구조화 데이터의 `name`이 모두 "Daily Report"다. `alternateName`은 없다.
  - 아이콘은 `app/icon.tsx`로 만든 32×32 PNG 하나다(`<link rel="icon" sizes="32x32">`). `apple-touch-icon`은 없다.
- 구글 문서(11-04 확인)
  - 사이트 이름: 서브도메인 단위도 지원한다. 흔한 이름은 피하라고 한다. 제공한 이름을 확신하지 못하면 다른 출처의 이름이나 도메인·서브도메인 이름을 보여 준다. 대비책으로 `alternateName`에 소문자 서브도메인을 넣으라고 권한다.
  - 아이콘: 정사각형, 8px 이상. 48×48px보다 큰 것을 권한다. `rel="icon"`과 `apple-touch-icon`을 읽는다.
  - 반영: 다시 수집하기까지 며칠에서 몇 주. Search Console의 URL 검사로 홈 색인을 요청하면 앞당길 수 있다.

## 3. 결정 사항

### 확정 (사용자 2026-11-04)

- 기획서대로 진행하고 배포한다("배포 진행해").

### 구현 방향

- **D1. 대체 이름**: WebSite 구조화 데이터에 `alternateName: ["<사이트 호스트>"]`를 넣는다. 호스트는 `getSiteUrl()`에서 뽑는다(운영은 `daily-report-ashy-nine.vercel.app`). 구글이 "Daily Report"를 쓰지 않더라도 "Vercel" 대신 서브도메인이 나오게 한다.
- **D2. 아이콘**: 지금 디자인(검은 둥근 사각형에 "D")은 그대로 두고 크기만 바꾼다.
  - `app/icon.tsx`: 192×192
  - `app/apple-icon.tsx` 추가: 180×180
  - 두 파일이 같은 그림을 쓰도록 그리는 함수를 하나로 모은다.
- **D3. 배포 후 색인 요청(사용자)**: Search Console → URL 검사 → 홈 주소 → 색인 생성 요청

### 확인 필요

- **U1. 그래도 "Vercel"이나 서브도메인으로 나오면**: 몇 주 뒤에도 "Daily Report"가 안 나오면, 흔하지 않은 이름으로 바꿀지 그때 정한다.

## 6. 작업 순서

1. `app/page.tsx` WebSite 구조화 데이터에 `alternateName`
2. 아이콘 그림 함수 분리, `icon.tsx` 192px, `apple-icon.tsx` 180px
3. 테스트·빌드, 빌드 결과 HTML에서 링크 태그와 구조화 데이터 확인
4. 커밋·배포 `v0.0.13`(사용자 요청 시), 운영 홈 HTML 확인
5. Search Console 색인 요청(사용자)

## 7. 검증

- [x] `npm test` 57/57, `npx tsc --noEmit`, `npm run lint`, `npm run build`(`SITE_URL`을 운영 주소로 준 빌드). 빌드 결과 홈 HTML에 `rel="icon" sizes="192x192"`, `rel="apple-touch-icon" sizes="180x180"`, `"alternateName":["daily-report-ashy-nine.vercel.app"]`. 아이콘 PNG 192×192·180×180을 열어 그림 확인. `robots.txt`는 전체 허용
- [x] 운영 홈 HTML(10:31 KST, push 후 약 1분): `rel="icon" sizes="192x192"`, `rel="apple-touch-icon" sizes="180x180"`, 구조화 데이터 `alternateName`
- [x] 아이콘 주소 두 개가 200 `image/png`(3.6KB, 2.4KB), Googlebot-Image 사용자 에이전트로도 200, `robots.txt` 전체 허용
- [ ] (며칠 ~ 몇 주 뒤) 구글 검색 결과의 이름·아이콘
