import Link from "next/link";
import { notFound } from "next/navigation";
import { ReportCard } from "@/components/ReportCard";
import { formatDateKo, formatDateShortKo } from "@/lib/date";
import { getAdjacentDates, getAllDates, getReportsByDate } from "@/lib/reports";
import { pageMetadata } from "@/lib/seo";
import { getTaskInfo } from "@/lib/tasks";

export const dynamicParams = false;

export function generateStaticParams() {
  return getAllDates().map((date) => ({ date }));
}

export async function generateMetadata({ params }: PageProps<"/day/[date]">) {
  const { date } = await params;
  const reports = getReportsByDate(date);
  const topics = reports.map((report) => `${getTaskInfo(report.task)?.shortTitle ?? report.title}: ${report.headline}`);
  return pageMetadata({
    path: `/day/${date}`,
    title: `${formatDateKo(date)} 브리핑`,
    description: topics.join(" · ").slice(0, 160),
  });
}

export default async function DayPage({ params }: PageProps<"/day/[date]">) {
  const { date } = await params;
  const reports = getReportsByDate(date);
  if (reports.length === 0) notFound();
  const { prev, next } = getAdjacentDates(date);

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <p className="font-mono text-xs text-muted">{date}</p>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{formatDateKo(date)} 브리핑</h1>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        {reports.map((report) => (
          <ReportCard key={report.task} report={report} />
        ))}
      </div>

      <nav aria-label="다른 날짜" className="flex justify-between gap-4 border-t border-line pt-6 text-sm">
        {prev ? (
          <Link href={`/day/${prev}`} className="text-muted hover:text-foreground">
            ← {formatDateShortKo(prev)}
          </Link>
        ) : (
          <span />
        )}
        {next && (
          <Link href={`/day/${next}`} className="text-muted hover:text-foreground">
            {formatDateShortKo(next)} →
          </Link>
        )}
      </nav>
    </div>
  );
}
