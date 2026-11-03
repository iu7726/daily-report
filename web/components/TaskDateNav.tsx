import Link from "next/link";
import { LevelDot } from "@/components/LevelBadge";
import { WEEKDAYS_KO, formatMonthKo, monthKeyOf, parseDate, weekday } from "@/lib/date";
import { type Report, pickAround } from "@/lib/reports";

/** 지금 보고서를 가운데 두고 보여 줄 날짜 수(기획서 D5) */
const WINDOW = 15;

/** 넓은 화면 왼쪽의 같은 작업 날짜 목록. 월마다 묶는다(기획서 D1, D5). */
export function TaskDateNav({
  task,
  taskTitle,
  reports,
  current,
}: {
  task: string;
  taskTitle: string;
  /** 같은 작업의 보고서, 최신순 */
  reports: Report[];
  current: string;
}) {
  const groups: { month: string; label: string; items: Report[] }[] = [];
  for (const report of pickAround(reports, current, WINDOW)) {
    const month = monthKeyOf(report.date);
    const last = groups[groups.length - 1];
    if (last?.month === month) last.items.push(report);
    else groups.push({ month, label: formatMonthKo(month), items: [report] });
  }

  return (
    <nav aria-label={`${taskTitle} 날짜 목록`} className="flex flex-col gap-4 text-[13px]">
      <Link href={`/${task}`} className="text-xs font-semibold text-muted hover:text-foreground">
        {taskTitle}
      </Link>
      {groups.map((group) => (
        <div key={group.month} className="flex flex-col gap-1">
          <p className="px-2 font-mono text-[11px] text-subtle">{group.label}</p>
          <ol className="flex flex-col">
            {group.items.map((report) => {
              const isCurrent = report.date === current;
              return (
                <li key={report.date}>
                  <Link
                    href={`/${task}/${report.date}`}
                    aria-current={isCurrent ? "page" : undefined}
                    className={`flex items-center gap-2 rounded-md px-2 py-1 transition-colors ${
                      isCurrent
                        ? "bg-surface-hover font-medium text-foreground"
                        : "text-muted hover:bg-surface hover:text-foreground"
                    }`}
                  >
                    <LevelDot level={report.level} />
                    <span>{dayLabel(report.date)}</span>
                  </Link>
                </li>
              );
            })}
          </ol>
        </div>
      ))}
      <Link href={`/${task}`} className="px-2 text-xs text-muted hover:text-foreground">
        전체 보기 →
      </Link>
    </nav>
  );
}

/** "3일 (화)" */
function dayLabel(date: string): string {
  const p = parseDate(date);
  if (!p) return date;
  return `${p.d}일 (${WEEKDAYS_KO[weekday(p.y, p.m, p.d)]})`;
}
