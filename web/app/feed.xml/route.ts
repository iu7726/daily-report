import { getAllReports, getTaskTitle } from "@/lib/reports";
import { SITE_DESCRIPTION, SITE_NAME, absoluteUrl } from "@/lib/site";

// 빌드 시점에 한 번 만든다.
export const dynamic = "force-static";

const FEED_SIZE = 50;

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** RSS pubDate(RFC 822). generated_at은 오프셋이 붙은 시각이라 그대로 해석해도 된다. 없으면 그날 KST 9시. */
function pubDate(generatedAt: string | null, date: string): string {
  const parsed = new Date(generatedAt ?? `${date}T09:00:00+09:00`);
  return Number.isNaN(parsed.getTime()) ? new Date(`${date}T09:00:00+09:00`).toUTCString() : parsed.toUTCString();
}

export function GET() {
  const reports = getAllReports().slice(0, FEED_SIZE);
  const items = reports
    .map((report) => {
      const url = absoluteUrl(`/${report.task}/${report.date}`);
      const categories = report.tags.map((tag) => `      <category>${escapeXml(tag)}</category>`).join("\n");
      return [
        "    <item>",
        `      <title>${escapeXml(`[${getTaskTitle(report.task)}] ${report.headline}`)}</title>`,
        `      <link>${url}</link>`,
        `      <guid isPermaLink="true">${url}</guid>`,
        `      <pubDate>${pubDate(report.generatedAt, report.date)}</pubDate>`,
        `      <description>${escapeXml(report.description)}</description>`,
        categories,
        "    </item>",
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(SITE_NAME)}</title>
    <link>${absoluteUrl("/")}</link>
    <description>${escapeXml(SITE_DESCRIPTION)}</description>
    <language>ko-KR</language>
    <atom:link href="${absoluteUrl("/feed.xml")}" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>
`;

  return new Response(xml, { headers: { "Content-Type": "application/rss+xml; charset=utf-8" } });
}
