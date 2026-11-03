import Link from "next/link";
import { notFound } from "next/navigation";
import { LevelBadge } from "@/components/LevelBadge";
import { Markdown } from "@/components/Markdown";
import { TagChip } from "@/components/TagChip";
import { formatDateKo, formatDateShortKo } from "@/lib/date";
import {
  type Report,
  getAdjacentInTask,
  getAllReports,
  getReport,
  getReportsByDate,
  getTaskTitle,
} from "@/lib/reports";
import { jsonLd, pageMetadata } from "@/lib/seo";
import { SITE_NAME, absoluteUrl } from "@/lib/site";
import { slugifyTag } from "@/lib/tags";
import { getTaskInfo } from "@/lib/tasks";

export const dynamicParams = false;

export function generateStaticParams() {
  return getAllReports().map((report) => ({ task: report.task, date: report.date }));
}

/** generated_at이 없으면 그날 KST 0시로 둔다 */
function publishedAt(report: Report): string {
  return report.generatedAt ?? `${report.date}T00:00:00+09:00`;
}

function pageTitle(report: Report): string {
  const taskTitle = getTaskTitle(report.task);
  return report.headline === report.title
    ? `${taskTitle} ${report.date}`
    : `${report.headline} — ${taskTitle} ${report.date}`;
}

export async function generateMetadata({ params }: PageProps<"/[task]/[date]">) {
  const { task, date } = await params;
  const report = getReport(task, date);
  if (!report) return {};
  return pageMetadata({
    path: `/${task}/${date}`,
    title: pageTitle(report),
    description: report.description,
    keywords: report.tags,
    openGraph: {
      type: "article",
      publishedTime: publishedAt(report),
      section: getTaskTitle(task),
      tags: report.tags,
    },
  });
}

export default async function ReportPage({ params }: PageProps<"/[task]/[date]">) {
  const { task, date } = await params;
  const report = getReport(task, date);
  if (!report) notFound();

  const taskTitle = getTaskTitle(task);
  const { prev, next } = getAdjacentInTask(task, date);
  const sameDay = getReportsByDate(date).filter((other) => other.task !== task);
  const url = absoluteUrl(`/${task}/${date}`);

  const articleLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: report.headline,
    description: report.description,
    datePublished: publishedAt(report),
    dateModified: publishedAt(report),
    inLanguage: "ko-KR",
    keywords: report.tags.join(", ") || undefined,
    articleSection: taskTitle,
    url,
    mainEntityOfPage: url,
    image: absoluteUrl(`/${task}/${date}/opengraph-image`),
    author: { "@type": "Organization", name: SITE_NAME },
    publisher: { "@type": "Organization", name: SITE_NAME },
  };

  return (
    <article className="mx-auto flex w-full max-w-3xl flex-col gap-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(articleLd) }} />

      <header className="flex flex-col gap-5">
        <nav aria-label="위치" className="flex flex-wrap items-center gap-2 text-xs text-muted">
          <Link href={`/${task}`} className="font-medium hover:text-foreground">
            {getTaskInfo(task)?.shortTitle ?? taskTitle}
          </Link>
          <span aria-hidden className="text-subtle">
            /
          </span>
          <Link href={`/day/${date}`} className="font-mono hover:text-foreground">
            {date}
          </Link>
        </nav>

        <h1 className="text-2xl font-semibold leading-tight tracking-tight sm:text-[2rem]">{report.headline}</h1>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-muted">
          <LevelBadge level={report.level} />
          <span>{formatDateKo(date)}</span>
          {report.baseTime && (
            <span className="inline-flex items-center gap-3">
              <span aria-hidden className="text-subtle">
                ·
              </span>
              <span>
                기준 시각 <span className="font-mono">{report.baseTime}</span>
              </span>
            </span>
          )}
          {report.generator === "chatgpt" && (
            <span className="inline-flex items-center gap-3">
              <span aria-hidden className="text-subtle">
                ·
              </span>
              <span>ChatGPT에서 옮겨 온 보고서</span>
            </span>
          )}
        </div>

        {report.summary && (
          <p className="rounded-xl border border-line bg-surface p-4 text-[15px] leading-relaxed sm:p-5">
            <span className="mr-2 text-xs font-semibold text-muted">결론</span>
            {report.summary}
          </p>
        )}

        {report.tags.length > 0 && (
          <ul aria-label="태그" className="flex flex-wrap gap-1.5">
            {report.tags.map((tag) => {
              const slug = slugifyTag(tag);
              return (
                <li key={tag}>
                  {slug ? (
                    <TagChip slug={slug} name={tag} />
                  ) : (
                    <span className="rounded-md border border-line px-2 py-0.5 font-mono text-[11px] text-muted">{tag}</span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </header>

      <Markdown>{report.body}</Markdown>

      <footer className="flex flex-col gap-8 border-t border-line pt-8">
        <nav aria-label="같은 작업의 다른 날짜" className="grid gap-3 sm:grid-cols-2">
          {prev ? <AdjacentLink report={prev} direction="prev" /> : <span />}
          {next && <AdjacentLink report={next} direction="next" />}
        </nav>

        {sameDay.length > 0 && (
          <section className="flex flex-col gap-3" aria-labelledby="same-day-heading">
            <h2 id="same-day-heading" className="text-xs font-semibold text-muted">
              같은 날 다른 브리핑
            </h2>
            <ul className="flex flex-col gap-2">
              {sameDay.map((other) => (
                <li key={other.task}>
                  <Link
                    href={`/${other.task}/${other.date}`}
                    className="flex items-center gap-3 text-sm hover:underline hover:underline-offset-4"
                  >
                    <LevelBadge level={other.level} />
                    <span className="text-muted">{getTaskInfo(other.task)?.shortTitle ?? other.title}</span>
                    <span className="truncate">{other.headline}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </footer>
    </article>
  );
}

function AdjacentLink({ report, direction }: { report: Report; direction: "prev" | "next" }) {
  return (
    <Link
      href={`/${report.task}/${report.date}`}
      className={`flex flex-col gap-1 rounded-xl border border-line p-4 transition-colors hover:border-subtle hover:bg-surface ${
        direction === "next" ? "sm:items-end sm:text-right" : ""
      }`}
    >
      <span className="text-xs text-muted">
        {direction === "prev" ? `← ${formatDateShortKo(report.date)}` : `${formatDateShortKo(report.date)} →`}
      </span>
      <span className="line-clamp-2 text-sm font-medium leading-snug">{report.headline}</span>
    </Link>
  );
}
