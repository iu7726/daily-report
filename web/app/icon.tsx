import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          height: "100%",
          borderRadius: 7,
          background: "#0a0a0a",
          color: "#ededed",
          fontSize: 21,
          fontWeight: 700,
        }}
      >
        D
      </div>
    ),
    size,
  );
}
