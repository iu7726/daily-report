import { addDays } from "./date";

/**
 * 보고서 frontmatter `metrics`에 남기는 숫자와 그 표기(기획서 2026-11-27_report-visuals R4).
 * 루틴은 그날 확인한 값만 남기고, 사이트는 이 값으로만 추이를 그린다. 과거 값을 AI가 다시 쓰지 않는다.
 * 키를 바꾸면 `scheduler/CLAUDE.md`의 `metrics` 정의와 `scheduler/scripts/report_lint.py`의 `METRIC_KEYS`도 같이 바꾼다.
 */
export type MetricKind = "count" | "value";
export type MetricInfo = { label: string; unit: string; kind: MetricKind; digits: number };

export const METRICS: Record<string, Record<string, MetricInfo>> = {
  "security-daily-report": {
    p1: { label: "P1 항목", unit: "건", kind: "count", digits: 0 },
    p2: { label: "P2 항목", unit: "건", kind: "count", digits: 0 },
    p3: { label: "P3 항목", unit: "건", kind: "count", digits: 0 },
    malicious_npm: { label: "npm 악성 패키지", unit: "건", kind: "count", digits: 0 },
    kev_added: { label: "KEV 신규 등재", unit: "건", kind: "count", digits: 0 },
  },
  "sp500-morning-check": {
    sp500: { label: "S&P500", unit: "", kind: "value", digits: 2 },
    sp500_change_pct: { label: "S&P500 등락률", unit: "%", kind: "value", digits: 2 },
    vix: { label: "VIX", unit: "", kind: "value", digits: 2 },
    us2y: { label: "미 국채 2년", unit: "%", kind: "value", digits: 2 },
    us10y: { label: "미 국채 10년", unit: "%", kind: "value", digits: 2 },
    usdkrw: { label: "원/달러", unit: "원", kind: "value", digits: 1 },
  },
};

/** 추이 차트의 기본 기간(일). 끝 날짜를 포함한다. */
export const TREND_DAYS = 30;

export function getMetricInfo(task: string, key: string): MetricInfo | undefined {
  return METRICS[task]?.[key];
}

export function metricKeys(task: string): string[] {
  return Object.keys(METRICS[task] ?? {});
}

export type MetricValues = Record<string, number>;
export type SeriesPoint = { date: string; value: number };
export type TrendWindow = { start: string; end: string };

/** frontmatter `metrics`에서 숫자만 남긴다. 숫자가 아닌 값과 빈 키는 버린다. */
export function sanitizeMetrics(value: unknown): MetricValues {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return {};
  const out: MetricValues = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    if (!/^[a-z][a-z0-9_]*$/.test(key)) continue;
    if (typeof raw === "number" && Number.isFinite(raw)) out[key] = raw;
  }
  return out;
}

/** `end`를 포함해 `days`일 동안의 기간 */
export function trendWindow(end: string, days = TREND_DAYS): TrendWindow {
  return { start: addDays(end, -(days - 1)), end };
}

/** 기간 안 보고서에서 한 지표의 값을 날짜순으로 모은다. 값이 없는 날은 건너뛴다. */
export function buildSeries(
  reports: { date: string; metrics: MetricValues }[],
  key: string,
  window: TrendWindow,
): SeriesPoint[] {
  return reports
    .filter((r) => r.date >= window.start && r.date <= window.end && typeof r.metrics[key] === "number")
    .map((r) => ({ date: r.date, value: r.metrics[key] }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** 작업의 모든 지표 시계열. 값이 하나도 없는 지표는 뺀다. */
export function buildTaskSeries(
  reports: { date: string; metrics: MetricValues }[],
  task: string,
  window: TrendWindow,
): Record<string, SeriesPoint[]> {
  const out: Record<string, SeriesPoint[]> = {};
  for (const key of metricKeys(task)) {
    const series = buildSeries(reports, key, window);
    if (series.length > 0) out[key] = series;
  }
  return out;
}

export function formatMetric(value: number, info: MetricInfo): string {
  const text = value.toLocaleString("ko-KR", { minimumFractionDigits: info.digits, maximumFractionDigits: info.digits });
  return info.unit ? `${text}${info.unit}` : text;
}
