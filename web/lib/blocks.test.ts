import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Markdown } from "@/components/Markdown";
import { parseFlow, parseTimeline, parseTrend, splitInlineCode } from "./blocks";
import { addDays, daysBetween } from "./date";
import { buildSeries, buildTaskSeries, sanitizeMetrics, trendWindow, type MetricValues } from "./metrics";
import { parseReport } from "./reports";

describe("parseTimeline", () => {
  it("시각 | 내용 | 수준 줄을 읽는다", () => {
    expect(parseTimeline("- 11-25 08:40 | 어제 아침 리포트\n- 11-26 03:15 | 긴급 감시: MongoDB | urgent\n")).toEqual([
      { when: "11-25 08:40", text: "어제 아침 리포트", level: null },
      { when: "11-26 03:15", text: "긴급 감시: MongoDB", level: "urgent" },
    ]);
  });
  it("수준 이름이 틀리거나 칸이 모자라면 null", () => {
    expect(parseTimeline("- a | b | critical\n- c | d")).toBeNull();
    expect(parseTimeline("- a | b\n- 내용만")).toBeNull();
    expect(parseTimeline("- a | b")).toBeNull();
  });
});

describe("parseFlow", () => {
  it("줄마다 단계 하나, 앞의 번호와 기호를 뗀다", () => {
    expect(parseFlow("1. 설치\n2) `tsc` 차지\n- 비밀 유출")).toEqual(["설치", "`tsc` 차지", "비밀 유출"]);
  });
  it("2~7단계만 받는다", () => {
    expect(parseFlow("하나")).toBeNull();
    expect(parseFlow(Array.from({ length: 8 }, (_, i) => `단계 ${i}`).join("\n"))).toBeNull();
  });
});

describe("parseTrend", () => {
  it("쉼표나 줄바꿈으로 나눈 키, 중복은 하나로", () => {
    expect(parseTrend("sp500, vix\nus10y, vix")).toEqual(["sp500", "vix", "us10y"]);
  });
  it("키 형식이 틀리면 null", () => {
    expect(parseTrend("S&P500")).toBeNull();
    expect(parseTrend("")).toBeNull();
  });
});

describe("splitInlineCode", () => {
  it("백틱 구간만 코드로 나눈다", () => {
    expect(splitInlineCode("`tsc` 실행")).toEqual([
      { code: true, text: "tsc" },
      { code: false, text: " 실행" },
    ]);
  });
});

describe("날짜 계산", () => {
  it("월과 해를 넘겨 더하고 뺀다", () => {
    expect(addDays("2026-11-27", -29)).toBe("2026-10-29");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(daysBetween("2026-10-29", "2026-11-27")).toBe(29);
  });
});

describe("metrics", () => {
  it("숫자만 남긴다", () => {
    expect(sanitizeMetrics({ p1: 0, p2: "2", sp500: 7182.78, Bad: 1, nan: Number.NaN })).toEqual({ p1: 0, sp500: 7182.78 });
    expect(sanitizeMetrics([1, 2])).toEqual({});
  });
  it("frontmatter의 metrics를 읽고, 없으면 빈 객체", () => {
    const withMetrics = parseReport('---\ntitle: "t"\nmetrics: {p1: 1, p2: 2}\n---\n본문\n', "security-daily-report", "2026-11-27");
    expect(withMetrics.report?.metrics).toEqual({ p1: 1, p2: 2 });
    const without = parseReport('---\ntitle: "t"\n---\n본문\n', "security-daily-report", "2026-11-27");
    expect(without.report?.metrics).toEqual({});
  });
  it("기간 안 값만 날짜순으로 모으고, 값이 없는 지표는 뺀다", () => {
    const reports: { date: string; metrics: MetricValues }[] = [
      { date: "2026-11-27", metrics: { p1: 1 } },
      { date: "2026-10-01", metrics: { p1: 9 } },
      { date: "2026-11-20", metrics: { p1: 0, p2: 3 } },
      { date: "2026-11-25", metrics: {} },
    ];
    const window = trendWindow("2026-11-27");
    expect(buildSeries(reports, "p1", window)).toEqual([
      { date: "2026-11-20", value: 0 },
      { date: "2026-11-27", value: 1 },
    ]);
    expect(Object.keys(buildTaskSeries(reports, "security-daily-report", window))).toEqual(["p1", "p2"]);
  });
});

type MarkdownProps = Parameters<typeof Markdown>[0];
const render = (markdown: string, trend?: MarkdownProps["trend"]) =>
  renderToStaticMarkup(createElement(Markdown, { trend } as MarkdownProps, markdown));

describe("Markdown 그림 블록과 배지", () => {
  it("timeline·flow 블록을 그림으로 그린다", () => {
    const html = render("```timeline\n- 03:15 | 긴급 감시 | urgent\n- 08:40 | 아침 리포트\n```\n\n```flow\n설치\n`tsc` 실행\n```\n");
    expect(html).not.toContain("<pre>");
    expect(html).toContain("긴급 감시");
    expect(html).toContain("· 긴급");
    expect(html).toContain("<code");
    expect(html).toContain("tsc</code>");
  });

  it("형식이 틀린 블록은 원래 코드 블록으로 보여 준다", () => {
    const html = render("```timeline\n한 줄뿐\n```\n");
    expect(html).toContain("<pre>");
    expect(html).toContain("한 줄뿐");
  });

  it("trend 블록은 지표 값으로 작은 차트를 그리고, 컨텍스트가 없으면 코드 블록으로 둔다", () => {
    const window = trendWindow("2026-11-27");
    const series = {
      sp500: [
        { date: "2026-11-25", value: 7182.78 },
        { date: "2026-11-27", value: 7230.1 },
      ],
    };
    const html = render("```trend\nsp500, unknown_key\n```\n", { task: "sp500-morning-check", window, series });
    expect(html).toContain("S&amp;P500");
    expect(html).toContain("7,230.10");
    expect(html).toContain("<svg");
    expect(html).not.toContain("unknown_key");
    expect(render("```trend\nsp500\n```\n")).toContain("<pre>");
  });

  it("값이 하나뿐인 지표는 차트 없이 지금 값과 안내를 보여 준다", () => {
    const window = trendWindow("2026-11-27");
    const html = render("```trend\np1\n```\n", {
      task: "security-daily-report",
      window,
      series: { p1: [{ date: "2026-11-27", value: 2 }] },
    });
    expect(html).toContain("2건");
    expect(html).toContain("추이는 값이 쌓이면 보입니다");
    expect(html).not.toContain("<svg");
  });

  it("값이 없는 지표는 타일을 빼고, 모두 비었으면 안내 한 줄만 보여 준다", () => {
    const window = trendWindow("2026-11-27");
    const series = { usdkrw: [{ date: "2026-11-27", value: 1337.9 }] };
    const some = render("```trend\nsp500, usdkrw\n```\n", { task: "sp500-morning-check", window, series });
    expect(some).toContain("원/달러");
    expect(some).not.toContain(">S&amp;P500<");
    const none = render("```trend\nsp500, vix\n```\n", { task: "sp500-morning-check", window, series: {} });
    expect(none).toContain("추이 차트는 값이 쌓이면 보입니다.");
    expect(none).not.toContain("<pre>");
  });

  it("표 칸과 소제목의 P1·P2·P3를 배지로 바꾼다", () => {
    const html = render("### ① [P2] AWS Config 런북\n\n| 분야 | 상태 |\n|---|---|\n| AWS | P1 |\n| DB | 이상 없음 |\n");
    expect(html).toMatch(/<h3 id="[^"]+">① <span[^>]*>P2<\/span> AWS Config 런북<\/h3>/);
    expect(html).toMatch(/<td><span[^>]*>P1<\/span><\/td>/);
    expect(html).toContain("<td>이상 없음</td>");
  });
});
