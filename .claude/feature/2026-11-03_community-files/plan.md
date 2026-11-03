# 커뮤니티 문서 (라이선스·보안 정책·템플릿) — 기획서

> 상태: **구현·검증 완료 (2026-11-03)**. `web/` 변경 없어 태그 없음
> 남은 것: 커밋·병합, 저장소 설정 2가지(사용자), 병합 후 `/community` 점검표 확인
>
> 구현 변경점 (계획 대비):
> - `reports/LICENSE` 맨 위에 적용 범위, 출처 표기 예, 인용 원문의 권리, 무보증을 한국어로 적고 그 아래에 CC BY 4.0 전문을 붙였다.
> - README 기획서 표에 빠져 있던 물결표 취소선 기획서도 함께 넣었다.

## 0. TL;DR

GitHub 커뮤니티 점검표(`/community`)가 28%(README, 소개 문구만)였다. 라이선스, 보안 정책, 행동 강령, 기여 안내, 이슈·PR 템플릿을 채운다. 개인 프로젝트라 형식만 채운 문서가 아니라 이 저장소에 실제로 쓰이는 내용으로 짧게 쓴다.

## 2. 현재 (2026-11-03)

- 커뮤니티 점검표 28%: README ○, 소개 문구 ○, 나머지 ×
- 라이선스가 없어 공개 저장소라도 남이 코드나 글을 쓸 수 없는 상태
- 저장소 기본 라벨(`bug`, `documentation`, `enhancement` 등)이 있다.
- 사이트의 보고서 읽기(`web/lib/reports.ts`)는 `reports/` 바로 아래의 파일을 건너뛴다. `reports/LICENSE`를 둬도 보고서 목록에 영향이 없다.

## 3. 결정 사항

### 확정 (사용자 2026-11-03)

- **D1. 점검표 항목을 모두 채운다**("다 해 줘").
- **D2. 라이선스를 나눈다.** 코드와 작업 프롬프트는 MIT(루트 `LICENSE`), 보고서 글은 CC BY 4.0(`reports/LICENSE`). 보고서에 인용한 원문은 원래 권리를 따른다.

### 구현 방향

- **D3. 저작권자는 GitHub 아이디(`iu7726`)**. 공개 저장소라 실명을 넣지 않는다.
- **D4. 루트 `LICENSE`는 MIT 원문 그대로**. 문구를 덧붙이면 GitHub가 라이선스를 알아보지 못한다. 보고서 예외는 `reports/LICENSE`와 README에 적는다.
- **D5. 연락 창구는 GitHub 기능만 쓴다.** 메일 주소를 공개하지 않는다.
  - 보안 문제: GitHub 비공개 취약점 신고
  - 행동 강령 위반: 글의 Report content(신고)
  - 보고서 오류·사이트 오류·제안: 이슈 템플릿
- **D6. 보안 정책 대상에 루틴 프롬프트 인젝션을 넣는다.** 루틴이 웹 문서를 읽고 저장소에 커밋하므로, 조사한 문서의 문구로 루틴이 엉뚱한 내용을 쓰거나 파일을 바꾸게 만드는 경로가 이 저장소의 실제 공격면이다.
- **D7. 행동 강령은 Contributor Covenant를 참고해 짧게 쓴다.** 원문 번역은 비공개 연락처(메일)를 요구해서 D5와 맞지 않는다.
- **D8. 보고서 파일을 직접 고치는 PR은 받지 않는다.** 보고서는 루틴이 쓴 기록이라 정정은 이슈로 받고 확인 후 반영한다.
- **D9. 문서는 `.github/`에 둔다**(루트를 깔끔하게). GitHub는 `.github/`의 SECURITY, CODE_OF_CONDUCT, CONTRIBUTING도 알아본다. `LICENSE`만 루트.

## 4. 구조

```
LICENSE                              MIT
reports/LICENSE                      CC BY 4.0 전문 (creativecommons.org legalcode.txt)
.github/
├── SECURITY.md
├── CODE_OF_CONDUCT.md
├── CONTRIBUTING.md
├── pull_request_template.md
└── ISSUE_TEMPLATE/
    ├── config.yml                   빈 이슈 허용, 보안 신고 링크
    ├── report-correction.yml        보고서 정정 요청 (documentation)
    ├── site-bug.yml                 사이트 오류 (bug)
    └── suggestion.yml               제안 (enhancement)
```

README(구조, 제보·기여, 라이선스 절, 기획서 표)와 루트 `CLAUDE.md`(구조 표)도 고친다. 사이트(`web/`)는 바꾸지 않는다.

## 6. 작업 순서

1. 위 파일 작성, README·CLAUDE.md 반영
2. 이슈 템플릿 YAML 문법 확인, 사이트 테스트·빌드(보고서 목록 영향 없음)
3. 커밋·병합(사용자 요청 시). `web/` 변경이 없어 태그 없음
4. 저장소 설정(사용자): Settings → Security의 Private vulnerability reporting 켜기, Settings → Moderation options의 Reported content 받기

## 7. 검증

- [x] 이슈 템플릿 YAML 4개 파싱(Ruby YAML): config, 보고서 정정 요청(항목 5), 사이트 오류(3), 제안(2)
- [x] `npm test` 57/57, `npm run build` 정적 페이지 226개, `reports/LICENSE`로 인한 경고 없음
- [ ] 병합 후 `/community` 점검표 확인
