import { Fragment } from "react";
import { MetricTile } from "@/components/charts/MetricTile";
import { splitInlineCode, type TimelineEvent } from "@/lib/blocks";
import { LEVEL_META } from "@/lib/level";
import { getMetricInfo, type SeriesPoint, type TrendWindow } from "@/lib/metrics";

/*
 * 보고서 본문의 그림 블록(기획서 2026-11-27_report-visuals R1). 루틴이 코드 블록에 데이터만 쓰면 여기서 그린다.
 * 본문 글자 크기(prose)를 따르지 않도록 not-prose로 감싼다.
 */

function InlineText({ text }: { text: string }) {
  return (
    <>
      {splitInlineCode(text).map((part, i) =>
        part.code ? (
          <code key={i} className="rounded bg-surface-hover px-1 py-px font-mono text-[0.85em]">
            {part.text}
          </code>
        ) : (
          <Fragment key={i}>{part.text}</Fragment>
        ),
      )}
    </>
  );
}

export function TimelineBlock({ events }: { events: TimelineEvent[] }) {
  return (
    <ol className="not-prose my-6 flex flex-col">
      {events.map((event, i) => (
        <li key={i} className="relative flex gap-3 pb-4 last:pb-0">
          {i < events.length - 1 && <span aria-hidden className="absolute bottom-0 left-[5px] top-4 w-px bg-line" />}
          <span
            aria-hidden
            className={`relative mt-[5px] size-[11px] shrink-0 rounded-full ring-2 ring-background ${
              event.level ? LEVEL_META[event.level].dotClass : "bg-foreground"
            }`}
          />
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="font-mono text-xs text-muted">
              {event.when}
              {event.level && <span className="font-sans"> · {LEVEL_META[event.level].label}</span>}
            </span>
            <span className="text-[15px] leading-relaxed">
              <InlineText text={event.text} />
            </span>
          </span>
        </li>
      ))}
    </ol>
  );
}

export function FlowBlock({ steps }: { steps: string[] }) {
  return (
    <ol className="not-prose my-6 flex flex-col">
      {steps.map((step, i) => (
        <li key={i} className="flex flex-col">
          <span className="flex items-start gap-3 rounded-lg border border-line bg-surface px-3 py-2.5">
            <span className="mt-[3px] flex size-5 shrink-0 items-center justify-center rounded-full bg-foreground text-[11px] font-semibold text-background">
              {i + 1}
            </span>
            <span className="min-w-0 text-[15px] leading-relaxed">
              <InlineText text={step} />
            </span>
          </span>
          {i < steps.length - 1 && (
            <svg aria-hidden viewBox="0 0 12 16" className="ml-[17px] h-4 w-3 text-subtle">
              <path d="M6 1v12M2 9l4 4 4-4" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </li>
      ))}
    </ol>
  );
}

export type TrendContext = { task: string; series: Record<string, SeriesPoint[]>; window: TrendWindow };

/**
 * 정의된 지표가 하나도 없으면 null. 호출한 쪽이 원래 코드 블록을 보여 준다.
 * 값이 아직 없는 지표(휴장일의 시장 값 등)는 빈 타일 대신 뺀다. 모두 비었으면 한 줄 안내만 보여 준다.
 */
export function TrendBlock({ keys, context }: { keys: string[]; context: TrendContext }) {
  const tiles = keys.flatMap((key) => {
    const info = getMetricInfo(context.task, key);
    return info ? [{ key, info, points: context.series[key] ?? [] }] : [];
  });
  if (tiles.length === 0) return null;
  const withData = tiles.filter((tile) => tile.points.length > 0);
  if (withData.length === 0) {
    return <p className="not-prose my-4 text-xs text-muted">추이 차트는 값이 쌓이면 보입니다.</p>;
  }
  return (
    <div className="not-prose my-6 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
      {withData.map((tile) => (
        <MetricTile key={tile.key} info={tile.info} points={tile.points} window={context.window} />
      ))}
    </div>
  );
}
