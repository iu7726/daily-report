import type { MetadataRoute } from "next";
import { getAllDates, getAllReports, getAllTaskIds, getReportsByDate, getReportsByTask } from "@/lib/reports";
import { absoluteUrl } from "@/lib/site";

const lastModifiedOf = (generatedAt: string | null, date: string) => generatedAt ?? `${date}T00:00:00+09:00`;

export default function sitemap(): MetadataRoute.Sitemap {
  const reports = getAllReports();
  const latest = reports[0];

  return [
    {
      url: absoluteUrl("/"),
      lastModified: latest ? lastModifiedOf(latest.generatedAt, latest.date) : undefined,
      changeFrequency: "daily",
      priority: 1,
    },
    ...getAllTaskIds().map((task) => {
      const newest = getReportsByTask(task)[0];
      return {
        url: absoluteUrl(`/${task}`),
        lastModified: newest ? lastModifiedOf(newest.generatedAt, newest.date) : undefined,
        changeFrequency: "daily" as const,
        priority: 0.8,
      };
    }),
    ...getAllDates().map((date) => {
      const newest = getReportsByDate(date)[0];
      return {
        url: absoluteUrl(`/day/${date}`),
        lastModified: lastModifiedOf(newest?.generatedAt ?? null, date),
        changeFrequency: "monthly" as const,
        priority: 0.5,
      };
    }),
    ...reports.map((report) => ({
      url: absoluteUrl(`/${report.task}/${report.date}`),
      lastModified: lastModifiedOf(report.generatedAt, report.date),
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
  ];
}
