import { ImageResponse } from "next/og";
import { BrandIcon } from "@/lib/brand-icon";

// iOS 홈 화면 아이콘. 모서리는 iOS가 둥글게 깎으므로 꽉 찬 사각형으로 그린다.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(<BrandIcon size={size.width} rounded={false} />, size);
}
