import { LevelStrip } from "@/components/charts/LevelStrip";
import { MetricTile } from "@/components/charts/MetricTile";
import { TagBars } from "@/components/charts/TagBars";
import { formatDateShortKo } from "@/lib/date";
import type { Level } from "@/lib/level";
import { buildTaskSeries, formatMetric, getMetricInfo, trendWindow, TREND_DAYS } from "@/lib/metrics";
import type { Report } from "@/lib/reports";

const TOP_TAGS = 8;

/**
 * 작업별 목록 페이지 위의 '최근 30일' 절(기획서 2026-11-27_report-visuals R3).
 * 수준 띠와 자주 나온 태그는 지금까지 쌓인 frontmatter로 바로 그리고, 숫자 추이는 `metrics`가 있을 때만 그린다.
 */
export function TaskTrends({ task, reports }: { task: string; reports: Report[] }) {
  if (reports.length === 0) return null;
  const end = reports.reduce((latest, report) => (report.date > latest ? report.date : latest), reports[0].date);
  const window = trendWindow(end);
  const recent = reports.filter((report) => report.date >= window.start && report.date <= window.end);

  const levels: Record<string, Level> = {};
  const tagCounts = new Map<string, number>();
  for (const report of recent) {
    levels[report.date] = report.level;
    for (const tag of report.tags) tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
  }
  const tags = [...tagCounts.entries()]
    .map(([name, count]) => ({ name, count }))
    .filter((tag) => tag.count >= 2)
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "ko"))
    .slice(0, TOP_TAGS);

  const series = buildTaskSeries(reports, task, window);
  const metricKeys = Object.keys(series);
  const tableDates = [...new Set(metricKeys.flatMap((key) => series[key].map((point) => point.date)))].sort().reverse();

  return (
    <section aria-labelledby="trends-heading" className="flex flex-col gap-6 rounded-xl border border-line p-4 sm:p-5">
      <h2 id="trends-heading" className="text-sm font-semibold tracking-tight">
        최근 {TREND_DAYS}일
      </h2>

      <div className="flex flex-col gap-2">
        <h3 className="text-xs font-medium text-muted">날짜별 수준</h3>
        <LevelStrip task={task} levels={levels} window={window} />
      </div>

      {tags.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="text-xs font-medium text-muted">자주 나온 태그 (2편 이상)</h3>
          <TagBars tags={tags} />
        </div>
      )}

      {metricKeys.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="text-xs font-medium text-muted">숫자 추이</h3>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            {metricKeys.map((key) => {
              const info = getMetricInfo(task, key);
              return info ? <MetricTile key={key} info={info} points={series[key]} window={window} /> : null;
            })}
          </div>
          <details className="text-sm">
            <summary className="cursor-pointer text-xs text-muted hover:text-foreground">숫자로 보기</summary>
            <div className="mt-2 overflow-x-auto">
              <table className="w-full text-left text-xs tabular-nums">
                <thead>
                  <tr className="border-b border-line text-muted">
                    <th className="py-1.5 pr-3 font-medium">날짜</th>
                    {metricKeys.map((key) => (
                      <th key={key} className="whitespace-nowrap py-1.5 pr-3 font-medium">
                        {getMetricInfo(task, key)?.label ?? key}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tableDates.map((date) => (
                    <tr key={date} className="border-b border-line last:border-0">
                      <td className="whitespace-nowrap py-1.5 pr-3 font-mono">{formatDateShortKo(date)}</td>
                      {metricKeys.map((key) => {
                        const info = getMetricInfo(task, key);
                        const point = series[key].find((p) => p.date === date);
                        return (
                          <td key={key} className="whitespace-nowrap py-1.5 pr-3">
                            {point && info ? formatMetric(point.value, info) : "-"}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </div>
      )}
    </section>
  );
}
