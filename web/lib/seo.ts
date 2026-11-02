import type { Metadata } from "next";
import { SITE_LOCALE, SITE_NAME } from "./site";

export const RSS_ALTERNATE = {
  "application/rss+xml": [{ url: "/feed.xml", title: `${SITE_NAME} RSS` }],
};

type PageMetaInput = {
  /** 사이트 기준 경로 (예: "/ai-dev-briefing") */
  path: string;
  title: string;
  description: string;
  /** 제목 템플릿(`· 사이트 이름`)을 붙이지 않는다 */
  absoluteTitle?: boolean;
  openGraph?: Partial<NonNullable<Metadata["openGraph"]>>;
  keywords?: string[];
};

/** 페이지마다 canonical·og:url을 자기 주소로 지정한다. 하위 페이지가 상위 값을 상속하지 않게 하려는 것이다. */
export function pageMetadata({ path, title, description, absoluteTitle, openGraph, keywords }: PageMetaInput): Metadata {
  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    keywords: keywords && keywords.length > 0 ? keywords : undefined,
    alternates: { canonical: path, types: RSS_ALTERNATE },
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      locale: SITE_LOCALE,
      url: path,
      title,
      description,
      ...openGraph,
    } as Metadata["openGraph"],
    twitter: { card: "summary_large_image", title, description },
  };
}

/** JSON-LD를 <script>에 넣을 때 `</script>`로 태그가 끊기지 않게 `<`를 이스케이프한다. */
export function jsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
