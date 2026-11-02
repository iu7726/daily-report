/** 사이트 이름. 바꾸려면 이 값만 고친다. */
export const SITE_NAME = "Daily Report";

export const SITE_TAGLINE = "매일 아침, AI가 정리하는 개발·시장·보안 브리핑";

export const SITE_DESCRIPTION =
  "AI가 매일 아침 공개 자료를 조사해 정리하는 AI·개발 도구 소식, S&P500 시장 점검, IT 보안 이슈 리포트입니다.";

export const SITE_LOCALE = "ko_KR";

export const REPO_URL = "https://github.com/iu7726/daily-report";

/** 보안 리포트를 로컬 프로젝트에 대 보는 Claude Code 스킬 설명 */
export const SECURITY_SKILL_URL = `${REPO_URL}/blob/main/.claude/skills/security-check/SKILL.md`;

/** canonical·sitemap·RSS·OG에 쓰는 사이트 절대 주소. SITE_URL → Vercel 운영 주소 → localhost 순서. */
export function getSiteUrl(): string {
  const explicit = process.env.SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/+$/, "");

  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (vercel) return `https://${vercel.replace(/\/+$/, "")}`;

  return "http://localhost:3000";
}

export function absoluteUrl(pathname: string): string {
  return new URL(pathname, `${getSiteUrl()}/`).toString();
}

// 검색엔진 소유 확인 값. 페이지 HTML에 그대로 공개되는 값이라 코드에 둔다. 환경 변수가 있으면 그 값을 쓴다.
export const GOOGLE_SITE_VERIFICATION =
  process.env.GOOGLE_SITE_VERIFICATION?.trim() || "Fv0IyKiStT2hI837Jljo0DkLjOlG8gcIKwfaee_6wRI";
export const NAVER_SITE_VERIFICATION =
  process.env.NAVER_SITE_VERIFICATION?.trim() || "6d486a9423b8af71b62e9be0ae8f11df01dd70f3";
