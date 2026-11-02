import Link from "next/link";
import { Calendar } from "@/components/Calendar";
import { ReportCard } from "@/components/ReportCard";
import { formatDateKo, monthKeyOf } from "@/lib/date";
import { getAllDates, getCalendarEntries, getReportsByDate, getReportsByTask } from "@/lib/reports";
import { jsonLd, pageMetadata } from "@/lib/seo";
import { SITE_DESCRIPTION, SITE_NAME, SITE_TAGLINE, getSiteUrl } from "@/lib/site";
import { TASKS } from "@/lib/tasks";

export const metadata = pageMetadata({
  path: "/",
  title: `${SITE_NAME} — ${SITE_TAGLINE}`,
  description: SITE_DESCRIPTION,
  absoluteTitle: true,
});

export default function HomePage() {
  const dates = getAllDates();
  const latestDate = dates[0];
  const latest = latestDate ? getReportsByDate(latestDate) : [];

  const websiteLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    description: SITE_DESCRIPTION,
    url: getSiteUrl(),
    inLanguage: "ko-KR",
  };

  return (
    <div className="flex flex-col gap-16">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(websiteLd) }} />

      <section className="flex flex-col gap-3">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{SITE_TAGLINE}</h1>
        <p className="max-w-2xl text-sm leading-relaxed text-muted sm:text-base">{SITE_DESCRIPTION}</p>
      </section>

      {latestDate ? (
        <section className="flex flex-col gap-5" aria-labelledby="latest-heading">
          <div className="flex items-baseline justify-between gap-4">
            <h2 id="latest-heading" className="text-sm font-semibold tracking-tight">
              최신 브리핑 <span className="ml-1 font-normal text-muted">{formatDateKo(latestDate)}</span>
            </h2>
            <Link href={`/day/${latestDate}`} className="text-xs text-muted hover:text-foreground">
              모아보기 →
            </Link>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {latest.map((report) => (
              <ReportCard key={report.task} report={report} />
            ))}
          </div>
        </section>
      ) : (
        <p className="rounded-xl border border-dashed border-line p-10 text-center text-sm text-muted">
          아직 보고서가 없습니다.
        </p>
      )}

      <div className="grid gap-10 md:grid-cols-[minmax(0,22rem)_1fr] md:gap-12">
        {latestDate && (
          <section className="flex flex-col gap-5" aria-labelledby="calendar-heading">
            <h2 id="calendar-heading" className="text-sm font-semibold tracking-tight">
              캘린더
            </h2>
            <Calendar
              entries={getCalendarEntries()}
              initialMonth={monthKeyOf(latestDate)}
              minMonth={monthKeyOf(dates[dates.length - 1])}
              maxMonth={monthKeyOf(latestDate)}
            />
          </section>
        )}

        <section className="flex flex-col gap-5" aria-labelledby="tasks-heading">
          <h2 id="tasks-heading" className="text-sm font-semibold tracking-tight">
            브리핑 종류
          </h2>
          <ul className="flex flex-col divide-y divide-line rounded-xl border border-line">
            {TASKS.map((task) => {
              const count = getReportsByTask(task.id).length;
              return (
                <li key={task.id}>
                  <Link
                    href={`/${task.id}`}
                    className="flex flex-col gap-1 p-5 transition-colors first:rounded-t-xl hover:bg-surface"
                  >
                    <span className="flex items-center justify-between gap-3">
                      <span className="font-medium tracking-tight">{task.title}</span>
                      <span className="font-mono text-xs text-subtle">{count}건</span>
                    </span>
                    <span className="text-sm leading-relaxed text-muted">{task.description}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </div>
  );
}
