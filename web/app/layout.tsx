import type { Metadata, Viewport } from "next";
import { Geist_Mono } from "next/font/google";
import Link from "next/link";
import "pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css";
import "./globals.css";
import { RSS_ALTERNATE } from "@/lib/seo";
import { REPO_URL, SITE_DESCRIPTION, SITE_LOCALE, SITE_NAME, getSiteUrl } from "@/lib/site";
import { TASKS } from "@/lib/tasks";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const googleVerification = process.env.GOOGLE_SITE_VERIFICATION?.trim();
const naverVerification = process.env.NAVER_SITE_VERIFICATION?.trim();

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: { default: SITE_NAME, template: `%s · ${SITE_NAME}` },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  // canonical·og:url은 페이지마다 지정한다(lib/seo.ts). 여기 두면 하위 페이지가 모두 홈을 대표 주소로 상속한다.
  alternates: { types: RSS_ALTERNATE },
  openGraph: { type: "website", siteName: SITE_NAME, locale: SITE_LOCALE },
  twitter: { card: "summary_large_image" },
  verification: {
    ...(googleVerification ? { google: googleVerification } : {}),
    ...(naverVerification ? { other: { "naver-site-verification": naverVerification } } : {}),
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className={`${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <SiteHeader />
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6 sm:py-14">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}

function SiteHeader() {
  return (
    <header className="sticky top-0 z-10 border-b border-line bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2 text-sm font-semibold tracking-tight">
          <span aria-hidden className="grid size-5 place-items-center rounded-[5px] bg-foreground text-[11px] font-bold text-background">
            D
          </span>
          {SITE_NAME}
        </Link>
        <nav aria-label="작업" className="-mx-2 flex flex-wrap items-center gap-1 text-sm text-muted">
          {TASKS.map((task) => (
            <Link
              key={task.id}
              href={`/${task.id}`}
              className="rounded-md px-2 py-1 transition-colors hover:bg-surface-hover hover:text-foreground"
            >
              {task.shortTitle}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}

function SiteFooter() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-8 text-xs leading-relaxed text-muted sm:px-6">
        <p className="max-w-2xl">
          모든 보고서는 AI가 공개 자료를 바탕으로 자동 작성했습니다. 내용이 틀리거나 늦을 수 있으니 중요한 판단 전에는
          보고서에 연결된 원문을 확인하세요. 시장 관련 내용은 정보 제공용이며 투자 권유가 아닙니다.
        </p>
        <div className="flex gap-4">
          <a href="/feed.xml" className="hover:text-foreground">
            RSS
          </a>
          <a href={REPO_URL} target="_blank" rel="noopener noreferrer" className="hover:text-foreground">
            GitHub
          </a>
        </div>
      </div>
    </footer>
  );
}
