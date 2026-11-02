"use client";

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import { WEEKDAYS_KO, formatMonthKo, monthGrid, parseDate, shiftMonth, todayInSeoul } from "@/lib/date";
import { LEVEL_META, type Level } from "@/lib/level";

type Entry = { task: string; level: Level };

type Props = {
  entries: Record<string, Entry[]>;
  /** 처음 보여 줄 달 (YYYY-MM) */
  initialMonth: string;
  /** 이동할 수 있는 범위 (YYYY-MM) */
  minMonth: string;
  maxMonth: string;
};

const LEVEL_RANK: Record<Level, number> = { urgent: 0, notice: 1, normal: 2 };

const subscribeNothing = () => () => {};

export function Calendar({ entries, initialMonth, minMonth, maxMonth }: Props) {
  const [month, setMonth] = useState(initialMonth);
  // 오늘 표시는 브라우저에서만 계산한다(빌드 시점과 방문 시점이 다르므로). 서버 렌더링 결과는 null.
  const today = useSyncExternalStore(subscribeNothing, todayInSeoul, () => null);

  const weeks = monthGrid(month);
  const canPrev = month > minMonth;
  const canNext = month < maxMonth;

  return (
    <div className="rounded-xl border border-line p-4 sm:p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold tracking-tight">{formatMonthKo(month)}</h3>
        <div className="flex gap-1">
          <MonthButton label="이전 달" disabled={!canPrev} onClick={() => setMonth(shiftMonth(month, -1))}>
            ←
          </MonthButton>
          <MonthButton label="다음 달" disabled={!canNext} onClick={() => setMonth(shiftMonth(month, 1))}>
            →
          </MonthButton>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {WEEKDAYS_KO.map((day, index) => (
          <div
            key={day}
            className={`pb-2 text-xs ${index === 0 ? "text-red-500/80" : "text-subtle"}`}
          >
            {day}
          </div>
        ))}
        {weeks.flat().map((date, index) => {
          if (!date) return <div key={`empty-${index}`} />;
          const dayEntries = [...(entries[date] ?? [])].sort((a, b) => LEVEL_RANK[a.level] - LEVEL_RANK[b.level]);
          const day = parseDate(date)?.d;
          const isToday = date === today;
          const base = "relative flex aspect-square flex-col items-center justify-center gap-1 rounded-lg text-sm";
          const todayRing = isToday ? "ring-1 ring-foreground/40" : "";

          if (dayEntries.length === 0) {
            return (
              <div key={date} className={`${base} ${todayRing} text-subtle`}>
                <span className="font-mono text-xs">{day}</span>
              </div>
            );
          }

          const urgent = dayEntries.filter((entry) => entry.level === "urgent").length;
          const label = `${date} 보고서 ${dayEntries.length}건${urgent ? `, 긴급 ${urgent}건` : ""}`;
          return (
            <Link
              key={date}
             
              href={`/day/${date}`}
              aria-label={label}
              title={label}
              className={`${base} ${todayRing} font-medium text-foreground transition-colors hover:bg-surface-hover`}
            >
              <span className="font-mono text-xs">{day}</span>
              <span className="flex gap-0.5">
                {dayEntries.map((entry) => (
                  <span key={entry.task} className={`size-1.5 rounded-full ${LEVEL_META[entry.level].dotClass}`} />
                ))}
              </span>
            </Link>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 border-t border-line pt-3 text-xs text-muted">
        {(Object.keys(LEVEL_META) as Level[]).map((level) => (
          <span key={level} className="inline-flex items-center gap-1.5">
            <span className={`size-1.5 rounded-full ${LEVEL_META[level].dotClass}`} />
            {LEVEL_META[level].label}
          </span>
        ))}
      </div>
    </div>
  );
}

function MonthButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="grid size-7 place-items-center rounded-md text-sm text-muted transition-colors hover:bg-surface-hover hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
    >
      {children}
    </button>
  );
}
