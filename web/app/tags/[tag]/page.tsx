import Link from "next/link";
import { notFound } from "next/navigation";
import { ReportRow } from "@/components/ReportCard";
import { getAllTags, getTag } from "@/lib/reports";
import { pageMetadata } from "@/lib/seo";
import type { TagInfo } from "@/lib/tags";
import { getTaskInfo } from "@/lib/tasks";

export const dynamicParams = false;

export function generateStaticParams() {
  return getAllTags().map((tag) => ({ tag: tag.slug }));
}

/** 이 태그가 나온 작업 이름들 (중복 없이, 등장 순) */
function taskNames(tag: TagInfo): string[] {
  return [...new Set(tag.reports.map((report) => getTaskInfo(report.task)?.shortTitle ?? report.title))];
}

export async function generateMetadata({ params }: PageProps<"/tags/[tag]">) {
  const tag = getTag((await params).tag);
  if (!tag) return {};
  const latest = tag.reports[0];
  return {
    ...pageMetadata({
      path: `/tags/${tag.slug}`,
      title: `${tag.name} 관련 브리핑`,
      description: `${taskNames(tag).join(", ")} 브리핑에서 ${tag.name} 관련 보고서 ${tag.reports.length}건을 모았습니다. 최근: ${latest.headline}`.slice(
        0,
        160,
      ),
      keywords: [tag.name],
    }),
    // 보고서 1건짜리 태그는 그 보고서와 내용이 겹쳐 색인하지 않는다(D3). 링크는 따라가게 둔다.
    ...(tag.indexable ? {} : { robots: { index: false, follow: true } }),
  };
}

export default async function TagPage({ params }: PageProps<"/tags/[tag]">) {
  const tag = getTag((await params).tag);
  if (!tag) notFound();

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-3">
        <nav aria-label="위치" className="text-xs text-muted">
          <Link href="/tags" className="hover:text-foreground">
            태그
          </Link>
        </nav>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{tag.name}</h1>
        <p className="text-sm text-muted">
          {taskNames(tag).join(" · ")} · 보고서 {tag.reports.length}건
        </p>
      </header>

      <div className="flex flex-col divide-y divide-line border-y border-line">
        {tag.reports.map((report) => (
          <ReportRow key={`${report.task}/${report.date}`} report={report} showTask />
        ))}
      </div>
    </div>
  );
}
