# Next.js 16.4.5 업그레이드 — 기획서

> 상태: **구현·검증 완료 (2026-11-04)**. 배포 `v0.0.12`
> 남은 것: 없음

## 0. TL;DR

11-04 보안 리포트의 ④(Next.js 11월 보안 릴리스, High 1건·Medium 6건)에 따라 사이트의 `next`를 16.4.3에서 16.4.5로 올린다. 사이트는 대부분의 해당 기능을 쓰지 않아 실제 영향은 작지만, 패치 버전이라 바로 올린다.

## 2. 현재 (2026-11-04)

- `web/package.json`: `next` 16.4.3, `eslint-config-next` 16.4.3. npm `latest`는 16.4.5.
- 이 릴리스가 해당하는 기능과 사이트 사용 여부
  - Cache Components(`use cache`, `unstable_cache`): 쓰지 않는다(`next.config.ts`에서 `cacheComponents`를 껐다).
  - 자체 호스팅(`next start`): 쓰지 않는다(Vercel 배포, 전부 SSG).
  - Edge 라우트의 `NextResponse.cookies.set()`, 미들웨어: 쓰지 않는다.
  - Image Optimization(`next/image`): 쓰지 않는다.
- 출처: 보안 리포트 `reports/security-daily-report/2026/11/04.md` ④, 11-03 리포트의 후속 확인 절(11-04 06:15)

## 3. 결정 사항

### 확정 (사용자 2026-11-04)

- **D1. `next`와 `eslint-config-next`를 16.4.5로 올린다.** 다른 의존성은 건드리지 않는다.

## 7. 검증

- [x] `npm install --save-exact next@16.4.5 eslint-config-next@16.4.5`: lockfile 변경 50줄, 다른 의존성은 그대로
- [x] `npm test` 57/57, `npx tsc --noEmit`, `npm run lint`, `npm run build`(정적 페이지 241개) 통과
- [x] `npm audit --omit=dev`: 운영 의존성 취약점 0건. 개발 도구(ESLint·Tailwind 쪽 `minimatch`, `postcss-selector-parser`)의 Moderate 18건은 업그레이드 전부터 있었고 빌드할 때만 쓰여 이번 범위에서 다루지 않는다. 기준 시각에 OSV(GitHub 보안 DB)에는 이번 Next.js 권고가 아직 없어 `npm audit`이 16.4.3을 잡지 못했다.
- [ ] 배포 후 사이트 확인
