import { ImageResponse } from "next/og";
import { BrandIcon } from "@/lib/brand-icon";

// 구글 검색 결과의 사이트 아이콘은 48×48보다 큰 것을 권한다. 브라우저 탭에서는 알아서 줄여 쓴다.
export const size = { width: 192, height: 192 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(<BrandIcon size={size.width} />, size);
}
