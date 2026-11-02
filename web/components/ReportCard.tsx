import Link from "next/link";
import { formatDateShortKo } from "@/lib/date";
import type { Report } from "@/lib/reports";
import { getTaskInfo } from "@/lib/tasks";
import { LevelBadge } from "./LevelBadge";

type Props = {
  report: Report;
  /** 카드 위쪽 작은 글씨: 작업 이름 / 날짜 */
  eyebrow?: "task" | "date";
};

export function ReportCard({ report, eyebrow = "task" }: Props) {
  const label =
    eyebrow === "task" ? (getTaskInfo(report.task)?.shortTitle ?? report.title) : formatDateShortKo(report.date);

  return (
    <Link
      href={`/${report.task}/${report.date}`}
      className="group flex h-full flex-col gap-3 rounded-xl border border-line bg-background p-5 transition-colors hover:border-subtle hover:bg-surface"
    >
      <div className="flex items-center justify-between gap-3">
        <span className={`text-xs text-muted ${eyebrow === "date" ? "tabular-nums" : "font-medium"}`}>{label}</span>
        <LevelBadge level={report.level} />
      </div>
      <h3 className="text-[15px] font-semibold leading-snug tracking-tight text-foreground">{report.headline}</h3>
      {report.summary && <p className="line-clamp-3 text-sm leading-relaxed text-muted">{report.summary}</p>}
      <span className="mt-auto pt-1 text-xs text-subtle transition-colors group-hover:text-foreground">
        읽기 →
      </span>
    </Link>
  );
}

/** 목록용 한 줄 행. showTask면 날짜 아래에 작업 이름도 표시한다(태그 페이지처럼 작업이 섞인 목록). */
export function ReportRow({ report, showTask = false }: { report: Report; showTask?: boolean }) {
  return (
    <Link
      href={`/${report.task}/${report.date}`}
      className="group grid gap-1.5 py-4 sm:grid-cols-[7.5rem_1fr] sm:gap-6"
    >
      <span className="flex gap-2 pt-0.5 text-xs text-muted sm:flex-col sm:gap-1">
        <span className="tabular-nums">{formatDateShortKo(report.date)}</span>
        {showTask && <span>{getTaskInfo(report.task)?.shortTitle ?? report.title}</span>}
      </span>
      <span className="flex min-w-0 flex-col gap-1.5">
        <span className="flex items-start gap-2">
          <span className="font-medium leading-snug tracking-tight group-hover:underline group-hover:underline-offset-4">
            {report.headline}
          </span>
          <span className="ml-auto shrink-0">
            <LevelBadge level={report.level} />
          </span>
        </span>
        {report.summary && <span className="line-clamp-2 text-sm leading-relaxed text-muted">{report.summary}</span>}
      </span>
    </Link>
  );
}
