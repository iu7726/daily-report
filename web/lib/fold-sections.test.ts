import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Markdown } from "@/components/Markdown";
import { getHeadings } from "./headings";

const render = (markdown: string) => renderToStaticMarkup(createElement(Markdown, null, markdown));

const REPORT = [
  "## 오늘 할 일",
  "",
  "- ① 4.20.2 이상으로 올려야 합니다.",
  "",
  "## 조사 기록",
  "",
  "- 조사 범위: 2026-11-25 08:25 ~ 11-26 08:25 KST",
  "- 확인 실패: Open VSX (공식 공지 페이지 없음)",
  "",
].join("\n");

describe("remarkFoldSections", () => {
  it("## 조사 기록 절을 details로 접고 소제목을 summary로 바꾼다", () => {
    const html = render(REPORT);
    expect(html).toContain('<details id="조사-기록" class="report-fold"><summary>조사 기록</summary>');
    expect(html).toMatch(/<details[^>]*>[\s\S]*조사 범위: 2026-11-25 08:25 ~ 11-26 08:25 KST[\s\S]*Open VSX[\s\S]*<\/details>/);
    expect(html).not.toContain(">조사 기록</h2>");
    expect(html).toContain('<h2 id="오늘-할-일">오늘 할 일</h2>');
  });

  it("다음 h2 앞에서 끝난다", () => {
    const html = render(`${REPORT}\n## 덧붙인 절\n\n본문\n`);
    expect(html).toMatch(/<\/details>\s*<h2 id="덧붙인-절">덧붙인 절<\/h2>/);
  });

  it("h3 소제목은 절 안에 그대로 둔다", () => {
    const html = render("## 조사 기록\n\n### 분야별\n\n- 클라우드: IAM\n");
    expect(html).toMatch(/<details[^>]*><summary>조사 기록<\/summary><h3 id="분야별">분야별<\/h3>/);
  });

  it("번호가 붙은 소제목도 접는다", () => {
    const html = render("## 9. 조사 기록\n\n- 조사 범위\n");
    expect(html).toContain('<details id="9-조사-기록" class="report-fold"><summary>9. 조사 기록</summary>');
  });

  it("h3 조사 기록이나 다른 이름의 절은 접지 않는다", () => {
    expect(render("### 조사 기록\n\n- 범위\n")).not.toContain("<details");
    expect(render("## 조사 기록 요약\n\n- 범위\n")).not.toContain("<details");
  });

  it("조사 기록 절이 없는 옛 보고서는 그대로다", () => {
    const html = render("## 1. 긴급 조치 요약\n\n- 없음\n\n## 2. 한눈에 보기\n\n본문\n");
    expect(html).not.toContain("<details");
    expect(html).toContain('<h2 id="1-긴급-조치-요약">1. 긴급 조치 요약</h2>');
  });

  it("목차 항목의 id와 details의 id가 같다", () => {
    const heading = getHeadings(REPORT).find((h) => h.text === "조사 기록");
    expect(heading).toEqual({ id: "조사-기록", text: "조사 기록", depth: 2 });
    expect(render(REPORT)).toContain(`<details id="${heading?.id}"`);
  });
});
