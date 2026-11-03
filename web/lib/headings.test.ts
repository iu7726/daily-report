import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { describe, expect, it } from "vitest";
import { Markdown } from "@/components/Markdown";
import { getHeadings, slugifyHeading } from "./headings";

describe("slugifyHeading", () => {
  it("한글·숫자는 남기고 기호는 지우며 공백은 하이픈으로 바꾼다", () => {
    expect(slugifyHeading("1. 긴급 조치 요약")).toBe("1-긴급-조치-요약");
    expect(slugifyHeading("② [P2 예고] Next.js — 11월 3일 보안 릴리스")).toBe("②-p2-예고-nextjs--11월-3일-보안-릴리스");
    expect(slugifyHeading("S&P 500")).toBe("sp-500");
  });
});

describe("getHeadings", () => {
  const body = [
    "# 맨 앞 h1",
    "## 오늘의 요약",
    "### `Claude Code` 2.1 — [릴리스](https://example.com) **노트**",
    "#### 4단계는 목차에 없다",
    "## 오늘의 요약",
    "## ① 첫 항목",
    "## ★ —",
    "```md",
    "## 코드 블록 안",
    "```",
    "| 표 | ## 아님 |",
    "|---|---|",
    "| a | b |",
  ].join("\n\n");

  const headings = getHeadings(body);

  it("h1·h2는 큰 절, h3는 항목으로 뽑고 h4와 코드 블록은 뺀다 (T3, T4)", () => {
    expect(headings.map((h) => [h.depth, h.text])).toEqual([
      [2, "맨 앞 h1"],
      [2, "오늘의 요약"],
      [3, "Claude Code 2.1 — 릴리스 노트"],
      [2, "오늘의 요약"],
      [2, "① 첫 항목"],
      [2, "★ —"],
    ]);
  });

  it("같은 이름은 -1을 붙이고, 글자가 없으면 section-N (T1, T5)", () => {
    expect(headings.map((h) => h.id)).toEqual([
      "맨-앞-h1",
      "오늘의-요약",
      "claude-code-21--릴리스-노트",
      "오늘의-요약-1",
      "①-첫-항목",
      "section-7",
    ]);
  });

  it("본문 렌더링의 소제목 id가 목차 id와 같다", () => {
    const html = renderToStaticMarkup(createElement(Markdown, null, body));
    const ids = [...html.matchAll(/<h[23] id="([^"]+)"/g)].map((m) => m[1]);
    expect(ids).toEqual(headings.map((h) => h.id));
    expect(html).toContain('<h4 id="4단계는-목차에-없다"');
  });
});

describe("물결표 취소선", () => {
  const render = (md: string) => renderToStaticMarkup(createElement(Markdown, null, md));

  it("범위 물결표가 한 줄에 두 번 나와도 취소선이 되지 않는다", () => {
    const html = render("10월 29일 09:27~20:35 UTC(18:27~05:35 KST)에 배포됐습니다.");
    expect(html).not.toContain("<del>");
    expect(html).toContain("09:27~20:35 UTC(18:27~05:35 KST)");
  });

  it("물결표 두 개(~~)는 표준대로 취소선이다", () => {
    expect(render("~~취소~~")).toContain("<del>취소</del>");
  });
});
