import { TagChip } from "@/components/TagChip";
import { getAllTags } from "@/lib/reports";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  path: "/tags",
  title: "태그",
  description: "AI·개발 도구, S&P500 시장, IT 보안 브리핑에서 다룬 기술·제품·CVE 태그를 모아 봅니다.",
});

export default function TagsPage() {
  const tags = getAllTags();

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-3">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">태그</h1>
        <p className="max-w-2xl text-sm leading-relaxed text-muted sm:text-base">
          브리핑에서 다룬 기술, 제품, CVE를 모았습니다. 숫자는 관련 보고서 수입니다.
        </p>
      </header>

      {tags.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <li key={tag.slug}>
              <TagChip slug={tag.slug} name={tag.name} count={tag.reports.length} dim={!tag.indexable} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-xl border border-dashed border-line p-10 text-center text-sm text-muted">
          아직 태그가 없습니다.
        </p>
      )}
    </div>
  );
}
