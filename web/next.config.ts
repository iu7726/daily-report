import type { NextConfig } from "next";

// 모든 페이지를 빌드 시점에 정적으로 만든다(기획서 D2).
// create-next-app 기본값인 cacheComponents·partialPrefetching은 끈다.
// 켜면 dynamicParams를 쓸 수 없고, 보고서가 0개일 때 generateStaticParams가 빈 배열이라 빌드가 실패한다.
const nextConfig: NextConfig = {
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
