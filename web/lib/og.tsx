import { readFile } from "node:fs/promises";
import path from "node:path";

// OG 이미지 엔진(Satori)은 woff2를 읽지 못해 pretendard 패키지의 OTF를 쓴다(기획서 D16).
const FONT_DIR = path.join(process.cwd(), "node_modules", "pretendard", "dist", "public", "static");

let fontsPromise: Promise<{ name: string; data: Buffer; weight: 500 | 700; style: "normal" }[]> | undefined;

export function loadOgFonts() {
  fontsPromise ??= Promise.all([
    readFile(path.join(FONT_DIR, "Pretendard-Medium.otf")),
    readFile(path.join(FONT_DIR, "Pretendard-Bold.otf")),
  ]).then(([medium, bold]) => [
    { name: "Pretendard", data: medium, weight: 500 as const, style: "normal" as const },
    { name: "Pretendard", data: bold, weight: 700 as const, style: "normal" as const },
  ]);
  return fontsPromise;
}

export const OG_SIZE = { width: 1200, height: 630 };

export const OG_COLORS = {
  background: "#0a0a0a",
  foreground: "#ededed",
  muted: "#a1a1aa",
  line: "#27272a",
};

/** 왼쪽 위 사이트 표시 */
export function OgBrand({ name, label }: { name: string; label?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 30, color: OG_COLORS.muted }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 44,
          height: 44,
          borderRadius: 10,
          background: OG_COLORS.foreground,
          color: OG_COLORS.background,
          fontSize: 26,
          fontWeight: 700,
        }}
      >
        D
      </div>
      <div style={{ display: "flex", color: OG_COLORS.foreground, fontWeight: 700 }}>{name}</div>
      {label ? <div style={{ display: "flex" }}>· {label}</div> : null}
    </div>
  );
}
