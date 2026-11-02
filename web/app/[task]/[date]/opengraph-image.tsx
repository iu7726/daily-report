import { ImageResponse } from "next/og";
import { formatDateKo } from "@/lib/date";
import { LEVEL_META } from "@/lib/level";
import { OG_COLORS, OG_SIZE, OgBrand, loadOgFonts } from "@/lib/og";
import { getAllReports, getReport, getTaskTitle } from "@/lib/reports";
import { SITE_NAME } from "@/lib/site";

export const alt = "보고서 제목과 날짜";
export const size = OG_SIZE;
export const contentType = "image/png";
export const dynamicParams = false;

export function generateStaticParams() {
  return getAllReports().map((report) => ({ task: report.task, date: report.date }));
}

export default async function Image({ params }: { params: Promise<{ task: string; date: string }> }) {
  const { task, date } = await params;
  const report = getReport(task, date);
  const headline = report?.headline ?? getTaskTitle(task);
  const level = LEVEL_META[report?.level ?? "normal"];
  // 너무 긴 제목은 이미지 밖으로 넘치지 않게 자른다.
  const text = headline.length > 70 ? `${headline.slice(0, 68)}…` : headline;

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          width: "100%",
          height: "100%",
          padding: "72px 80px",
          background: OG_COLORS.background,
          color: OG_COLORS.foreground,
          fontFamily: "Pretendard",
        }}
      >
        <OgBrand name={SITE_NAME} label={getTaskTitle(task)} />
        <div
          style={{
            display: "flex",
            fontSize: text.length > 40 ? 56 : 66,
            fontWeight: 700,
            lineHeight: 1.3,
            letterSpacing: -1.5,
            wordBreak: "keep-all",
          }}
        >
          {text}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 20, fontSize: 28, color: OG_COLORS.muted }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "8px 18px",
              borderRadius: 999,
              border: `2px solid ${level.ogColor}`,
              color: level.ogColor,
              fontWeight: 700,
            }}
          >
            <div style={{ display: "flex", width: 12, height: 12, borderRadius: 999, background: level.ogColor }} />
            {level.label}
          </div>
          <div style={{ display: "flex", fontWeight: 500 }}>{formatDateKo(date)}</div>
        </div>
      </div>
    ),
    { ...size, fonts: await loadOgFonts() },
  );
}
