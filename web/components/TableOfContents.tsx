"use client";

import { useEffect, useState } from "react";
import type { TocHeading } from "@/lib/headings";

/** 상단 헤더(sticky) 아래 이만큼 내려온 지점을 지난 마지막 소제목을 지금 읽는 절로 본다. */
const ACTIVE_OFFSET = 112;

/** 넓은 화면 오른쪽 목차. 스크롤하면 지금 읽는 절을 진하게 표시한다(기획서 D7). */
export function TableOfContents({ headings }: { headings: TocHeading[] }) {
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    const elements = headings
      .map((heading) => document.getElementById(heading.id))
      .filter((element): element is HTMLElement => element !== null);
    let frame = 0;

    const update = () => {
      frame = 0;
      let current: string | null = null;
      for (const element of elements) {
        if (element.getBoundingClientRect().top > ACTIVE_OFFSET) break;
        current = element.id;
      }
      // 마지막 절이 짧아 위까지 올라오지 못해도 맨 아래에 닿으면 마지막 절로 본다.
      const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
      if (atBottom && elements.length > 0 && current !== null) current = elements[elements.length - 1].id;
      setActiveId(current);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    schedule();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [headings]);

  return (
    <nav aria-label="목차" className="flex flex-col gap-3">
      <p className="text-xs font-semibold text-muted">목차</p>
      <ol className="flex flex-col border-l border-line text-[13px]">
        {headings.map((heading) => {
          const active = heading.id === activeId;
          return (
            <li key={heading.id}>
              <a
                href={`#${heading.id}`}
                aria-current={active ? "location" : undefined}
                className={`-ml-px block border-l py-1 leading-snug transition-colors ${
                  heading.depth === 3 ? "pl-6" : "pl-3"
                } ${
                  active
                    ? "border-foreground font-medium text-foreground"
                    : "border-transparent text-muted hover:text-foreground"
                }`}
              >
                {/* 패딩 바깥에서 자르도록 글자만 감싼다(셋째 줄이 비치지 않게). */}
                <span className="line-clamp-2">{heading.text}</span>
              </a>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/** 좁은 화면용 접힌 목차(기획서 D3). 자바스크립트 없이 동작한다. */
export function TableOfContentsDisclosure({ headings }: { headings: TocHeading[] }) {
  return (
    <details className="group rounded-xl border border-line">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-medium [&::-webkit-details-marker]:hidden">
        <span>
          목차 <span className="ml-1 font-mono text-xs text-muted">{headings.length}</span>
        </span>
        <svg
          aria-hidden
          viewBox="0 0 16 16"
          className="size-4 text-muted transition-transform group-open:rotate-180"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path d="m4 6 4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </summary>
      <ol className="flex flex-col gap-1 border-t border-line px-4 py-3 text-sm">
        {headings.map((heading) => (
          <li key={heading.id} className={heading.depth === 3 ? "pl-4" : ""}>
            <a
              href={`#${heading.id}`}
              className={`block py-1 leading-snug hover:text-foreground ${
                heading.depth === 3 ? "text-muted" : "font-medium"
              }`}
            >
              <span className="line-clamp-2">{heading.text}</span>
            </a>
          </li>
        ))}
      </ol>
    </details>
  );
}
