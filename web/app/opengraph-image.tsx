import { ImageResponse } from "next/og";
import { OG_COLORS, OG_SIZE, OgBrand, loadOgFonts } from "@/lib/og";
import { SITE_NAME, SITE_TAGLINE } from "@/lib/site";
import { TASKS } from "@/lib/tasks";

export const alt = `${SITE_NAME} — ${SITE_TAGLINE}`;
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image() {
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
        <OgBrand name={SITE_NAME} />
        <div style={{ display: "flex", fontSize: 68, fontWeight: 700, lineHeight: 1.25, letterSpacing: -1.5 }}>
          {SITE_TAGLINE}
        </div>
        <div style={{ display: "flex", gap: 14 }}>
          {TASKS.map((task) => (
            <div
              key={task.id}
              style={{
                display: "flex",
                padding: "10px 20px",
                borderRadius: 999,
                border: `2px solid ${OG_COLORS.line}`,
                fontSize: 26,
                fontWeight: 500,
                color: OG_COLORS.muted,
              }}
            >
              {task.shortTitle}
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size, fonts: await loadOgFonts() },
  );
}
