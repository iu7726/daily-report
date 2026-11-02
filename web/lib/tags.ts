import type { Report } from "./reports";

/** 보고서가 이 수 이상인 태그만 검색엔진 색인과 sitemap에 넣는다(태그 기획서 D3). */
export const MIN_REPORTS_TO_INDEX = 2;

export type TagInfo = {
  slug: string;
  /** 합쳐진 표기 중 가장 많이 쓰인 것 */
  name: string;
  /** 이 태그가 붙은 보고서 (최신순) */
  reports: Report[];
  indexable: boolean;
};

/**
 * 태그 → 주소용 slug (태그 기획서 D1).
 * 소문자, 점·& 제거, 공백·_·/ → -, 글자·숫자·-·+ 외 제거. 한글은 그대로.
 * 예: "Node.js" → "nodejs", "미국 국채" → "미국-국채", "S&P500" → "sp500"
 */
export function slugifyTag(tag: string): string {
  return tag
    .normalize("NFKC")
    .trim()
    .toLowerCase()
    .replace(/[.&]/g, "")
    .replace(/[\s_/]+/g, "-")
    .replace(/[^\p{L}\p{N}+-]/gu, "")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** 보고서 목록(최신순)에서 태그를 모은다. 많이 쓰인 순, 같으면 이름순. */
export function buildTags(reports: Report[]): TagInfo[] {
  type Acc = { reports: Report[]; names: Map<string, { count: number; latest: string }> };
  const bySlug = new Map<string, Acc>();

  for (const report of reports) {
    const counted = new Set<string>();
    for (const raw of report.tags) {
      const name = raw.trim();
      const slug = slugifyTag(name);
      if (!slug) continue; // T2

      let acc = bySlug.get(slug);
      if (!acc) {
        acc = { reports: [], names: new Map() };
        bySlug.set(slug, acc);
      }
      const seen = acc.names.get(name);
      if (seen) {
        seen.count++;
        if (report.date > seen.latest) seen.latest = report.date;
      } else {
        acc.names.set(name, { count: 1, latest: report.date });
      }
      // 한 보고서에 같은 slug가 여러 번 나와도 보고서는 한 번만 센다(T7).
      if (!counted.has(slug)) {
        acc.reports.push(report);
        counted.add(slug);
      }
    }
  }

  const tags: TagInfo[] = [...bySlug].map(([slug, acc]) => {
    // 많이 쓰인 표기, 같으면 최근에 쓰인 표기(D2)
    const [name] = [...acc.names].sort(
      ([, a], [, b]) => b.count - a.count || (a.latest < b.latest ? 1 : a.latest > b.latest ? -1 : 0),
    )[0];
    return { slug, name, reports: acc.reports, indexable: acc.reports.length >= MIN_REPORTS_TO_INDEX };
  });

  return tags.sort((a, b) => b.reports.length - a.reports.length || a.name.localeCompare(b.name, "ko"));
}

/** 페이지가 받은 주소 값은 인코딩돼 있을 수 있다(T3). */
export function decodeTagParam(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
