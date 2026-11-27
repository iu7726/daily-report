import { daysBetween, formatDateShortKo } from "@/lib/date";
import { formatMetric, type MetricInfo, type SeriesPoint, type TrendWindow } from "@/lib/metrics";

/*
 * 지표 하나의 작은 추이 차트(작은 여러 개 중 하나). 축 두 개를 겹치지 않도록 지표마다 따로 그린다.
 * 색은 단일 계열 파란색(--chart-series) 하나이고, 값은 마지막 값과 마우스를 올렸을 때의 <title>로 보여 준다.
 * 개수(count)는 막대, 값(value)은 선으로 그린다. 정적 생성 SVG라 클라이언트 스크립트가 없다.
 */

const W = 160;
const H = 44;
const PAD_X = 3;
const PAD_Y = 5;

function xOf(date: string, window: TrendWindow): number {
  const span = Math.max(1, daysBetween(window.start, window.end));
  return PAD_X + (daysBetween(window.start, date) / span) * (W - PAD_X * 2);
}

export function MetricTile({
  info,
  points,
  window,
}: {
  info: MetricInfo;
  points: SeriesPoint[];
  window: TrendWindow;
}) {
  const last = points.at(-1);
  const values = points.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const days = daysBetween(window.start, window.end) + 1;

  let chart: React.ReactNode = null;
  if (points.length >= 2) {
    if (info.kind === "count") {
      const top = Math.max(1, max);
      const barW = Math.max(2, (W - PAD_X * 2) / days - 1.5);
      chart = points.map((p) => {
        const h = (p.value / top) * (H - PAD_Y * 2);
        const x = xOf(p.date, window) - barW / 2;
        return (
          <g key={p.date}>
            <title>{`${formatDateShortKo(p.date)} · ${formatMetric(p.value, info)}`}</title>
            <rect x={x - 1} y={0} width={barW + 2} height={H} fill="transparent" />
            {h > 0 && <rect x={x} y={H - PAD_Y - h} width={barW} height={h} rx={Math.min(2, barW / 2)} className="fill-[var(--chart-series)]" />}
          </g>
        );
      });
    } else {
      const lo = min === max ? min - 1 : min;
      const hi = min === max ? max + 1 : max;
      const yOf = (v: number) => H - PAD_Y - ((v - lo) / (hi - lo)) * (H - PAD_Y * 2);
      const path = points.map((p, i) => `${i === 0 ? "M" : "L"}${xOf(p.date, window).toFixed(1)},${yOf(p.value).toFixed(1)}`).join(" ");
      const end = points[points.length - 1];
      chart = (
        <>
          <path d={path} fill="none" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" className="stroke-[var(--chart-series)]" />
          <circle cx={xOf(end.date, window)} cy={yOf(end.value)} r={3.5} strokeWidth={2} className="fill-[var(--chart-series)] stroke-[var(--background)]" />
          {points.map((p) => (
            <circle key={p.date} cx={xOf(p.date, window)} cy={yOf(p.value)} r={6} fill="transparent">
              <title>{`${formatDateShortKo(p.date)} · ${formatMetric(p.value, info)}`}</title>
            </circle>
          ))}
        </>
      );
    }
  }

  const caption =
    points.length < 2
      ? "추이는 값이 쌓이면 보입니다"
      : info.kind === "count"
        ? `${points.length}일 합계 ${formatMetric(values.reduce((a, b) => a + b, 0), info)}`
        : `최저 ${formatMetric(min, info)} · 최고 ${formatMetric(max, info)}`;

  return (
    <figure className="flex min-w-0 flex-col gap-1 rounded-lg border border-line bg-surface p-3">
      <figcaption className="flex items-baseline justify-between gap-2">
        <span className="truncate text-xs text-muted">{info.label}</span>
        {last && <span className="shrink-0 font-mono text-[11px] text-subtle">{formatDateShortKo(last.date)}</span>}
      </figcaption>
      <span className="text-lg font-semibold tabular-nums tracking-tight">{last ? formatMetric(last.value, info) : "-"}</span>
      {chart && (
        <svg
          viewBox={`0 0 ${W} ${H}`}
          role="img"
          aria-label={`${info.label} 최근 ${days}일 추이, ${caption}`}
          className="h-auto w-full overflow-visible"
        >
          <line x1={0} x2={W} y1={H - PAD_Y + 0.5} y2={H - PAD_Y + 0.5} strokeWidth={1} className="stroke-[var(--line)]" />
          {chart}
        </svg>
      )}
      <span className="text-[11px] text-muted">{caption}</span>
    </figure>
  );
}
