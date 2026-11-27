import Link from "next/link";
import { addDays, daysBetween, formatDateShortKo } from "@/lib/date";
import { LEVEL_META, LEVELS, type Level } from "@/lib/level";
import type { TrendWindow } from "@/lib/metrics";

/*
 * 최근 기간의 날짜별 수준 띠. 칸 하나가 하루이고, 칸 색은 그날 보고서의 수준이다.
 * 상태 색은 홈 달력의 점과 같은 색을 쓰고, 범례와 칸마다 날짜·수준 툴팁을 붙여 색만으로 뜻을 전하지 않는다.
 */
export function LevelStrip({
  task,
  levels,
  window,
}: {
  task: string;
  levels: Record<string, Level>;
  window: TrendWindow;
}) {
  const days = daysBetween(window.start, window.end) + 1;
  const dates = Array.from({ length: days }, (_, i) => addDays(window.start, i));
  const counts = Object.fromEntries(LEVELS.map((level) => [level, 0])) as Record<Level, number>;
  for (const level of Object.values(levels)) counts[level] += 1;

  return (
    <div className="flex flex-col gap-2">
      <div className="grid gap-[2px]" style={{ gridTemplateColumns: `repeat(${days}, minmax(0, 1fr))` }}>
        {dates.map((date) => {
          const level = levels[date];
          const label = `${formatDateShortKo(date)} · ${level ? LEVEL_META[level].label : "보고서 없음"}`;
          return level ? (
            <Link
              key={date}
              href={`/${task}/${date}`}
              title={label}
              aria-label={label}
              className={`aspect-[1/2] rounded-[3px] transition-opacity hover:opacity-75 sm:aspect-square ${LEVEL_META[level].dotClass}`}
            />
          ) : (
            <span key={date} title={label} className="aspect-[1/2] rounded-[3px] border border-line sm:aspect-square" />
          );
        })}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-[11px] text-muted">
        <span className="font-mono">
          {formatDateShortKo(window.start)} ~ {formatDateShortKo(window.end)}
        </span>
        <span className="flex flex-wrap items-center gap-3">
          {LEVELS.map((level) => (
            <span key={level} className="inline-flex items-center gap-1">
              <span aria-hidden className={`size-2 rounded-[2px] ${LEVEL_META[level].dotClass}`} />
              {LEVEL_META[level].label} {counts[level]}일
            </span>
          ))}
        </span>
      </div>
    </div>
  );
}
