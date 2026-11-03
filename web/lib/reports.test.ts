import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { loadReports, parseReport, stripImportNotice, stripLeadingLines } from "./reports";

const FIXTURES = path.join(__dirname, "__fixtures__", "reports");

describe("loadReports", () => {
  const { reports, warnings } = loadReports(FIXTURES);
  const find = (task: string, date: string) =>
    reports.find((report) => report.task === task && report.date === date);

  it("읽을 수 있는 보고서만 최신 날짜 → 작업 순서로 정렬한다 (A5)", () => {
    expect(reports.map((report) => `${report.task}/${report.date}`)).toEqual([
      "security-daily-report/2026-11-02",
      "ai-dev-briefing/2026-11-02",
      "zz-new-task/2026-11-02",
      "ai-dev-briefing/2026-11-01",
      "ai-dev-briefing/2026-10-31",
      "ai-dev-briefing/2026-10-30",
    ]);
  });

  it("frontmatter가 없거나 YAML이 깨진 파일은 경고하고 건너뛴다 (A2)", () => {
    expect(warnings).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/^sp500-morning-check\/2026-11-02\.md: frontmatter가 없어/),
        expect.stringMatching(/^sp500-morning-check\/2026-10-31\.md: frontmatter YAML 오류/),
      ]),
    );
  });

  it("파일 이름이 날짜가 아니거나 없는 날짜면 건너뛴다 (A7)", () => {
    expect(warnings).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/^sp500-morning-check\/notes\.md: 파일 이름이/),
        expect.stringMatching(/^sp500-morning-check\/2026-02-30\.md: 파일 이름이/),
      ]),
    );
  });

  it("작업 ID 형식이 아닌 폴더는 건너뛰고, 폴더가 아닌 파일은 무시한다", () => {
    expect(warnings).toContainEqual(expect.stringMatching(/^Bad_Dir\/: 작업 ID 형식이 아니라/));
    expect(warnings.some((warning) => warning.includes("README"))).toBe(false);
  });

  it("모든 필드가 있는 보고서를 그대로 읽는다", () => {
    const report = find("ai-dev-briefing", "2026-11-02");
    expect(report).toMatchObject({
      title: "AI·개발 도구 브리핑",
      level: "notice",
      summary: "결론 한 줄",
      headline: "MCP SDK 2.4 출시",
      description: "MCP TypeScript SDK 2.4.0 출시와 Claude Code 업데이트를 정리했습니다.",
      baseTime: "2026-11-02 15:03 KST",
    });
    // 숫자 태그는 문자열로, 중복은 한 번만
    expect(report?.tags).toEqual(["MCP", "Claude Code", "2026"]);
  });

  it("따옴표 없는 날짜·시각도 문자열 그대로 읽는다 (A8)", () => {
    expect(find("ai-dev-briefing", "2026-11-02")?.generatedAt).toBe("2026-11-02T15:03:00+09:00");
  });

  it("level·SEO 필드가 없으면 기본값으로 대신한다 (A3, S1)", () => {
    expect(find("ai-dev-briefing", "2026-11-01")).toMatchObject({
      level: "normal",
      headline: "AI·개발 도구 브리핑",
      description: "새 소식 없음",
      tags: [],
      generatedAt: null,
    });
  });

  it("경로와 다른 task·date, 틀린 level은 경고하고 경로·기본값을 쓴다 (A3, A4)", () => {
    const report = find("security-daily-report", "2026-11-02");
    expect(report).toMatchObject({ task: "security-daily-report", date: "2026-11-02", level: "normal" });
    expect(report?.description).toBe("IT 보안 이슈 데일리 리포트 2026-11-02");
    expect(warnings).toEqual(
      expect.arrayContaining([
        expect.stringContaining("security-daily-report/2026-11-02.md: frontmatter task(security-report)"),
        expect.stringContaining("security-daily-report/2026-11-02.md: frontmatter date(2026-11-03)"),
        expect.stringContaining("security-daily-report/2026-11-02.md: 알 수 없는 level(high)"),
      ]),
    );
  });

  it("새 구조(YYYY/MM/DD.md)를 읽는다", () => {
    expect(find("ai-dev-briefing", "2026-10-31")).toMatchObject({ level: "urgent", headline: "새 구조 파일" });
  });

  it("같은 날짜가 예전 구조와 새 구조에 다 있으면 새 구조를 쓰고 경고한다", () => {
    expect(find("ai-dev-briefing", "2026-10-30")?.headline).toBe("새 구조");
    expect(reports.filter((r) => r.task === "ai-dev-briefing" && r.date === "2026-10-30")).toHaveLength(1);
    expect(warnings).toContainEqual(expect.stringContaining("ai-dev-briefing/2026/10/30.md: 같은 날짜(2026-10-30)"));
  });

  it("새 구조에서 없는 날짜·연도 폴더가 아닌 폴더는 건너뛴다", () => {
    expect(warnings).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/^sp500-morning-check\/2026\/02\/30\.md: 파일 이름이 DD\.md 형식이 아니거나 없는 날짜라/),
        expect.stringMatching(/^security-daily-report\/26\/: 연도 폴더/),
      ]),
    );
  });

  it("모르는 작업은 frontmatter title로 표시한다 (A5)", () => {
    expect(find("zz-new-task", "2026-11-02")?.title).toBe("새 작업");
  });

  it("보고서 폴더가 없거나 비어 있으면 빈 목록 (A1)", () => {
    expect(loadReports(path.join(FIXTURES, "없는-폴더"))).toEqual({ reports: [], warnings: [] });
    const empty = fs.mkdtempSync(path.join(os.tmpdir(), "reports-"));
    try {
      expect(loadReports(empty)).toEqual({ reports: [], warnings: [] });
    } finally {
      fs.rmSync(empty, { recursive: true });
    }
  });
});

describe("parseReport", () => {
  it("따옴표 없는 date가 경로와 다르면 문자열로 비교해 경고한다 (A8)", () => {
    const raw = "---\ntitle: t\ndate: 2026-11-03\n---\n본문";
    expect(parseReport(raw, "ai-dev-briefing", "2026-11-02").warnings).toEqual([
      expect.stringContaining("frontmatter date(2026-11-03)"),
    ]);
  });

  it("BOM과 CRLF 줄바꿈도 읽는다", () => {
    const raw = "﻿---\r\ntitle: t\r\nlevel: urgent\r\n---\r\n본문";
    expect(parseReport(raw, "ai-dev-briefing", "2026-11-02").report).toMatchObject({
      level: "urgent",
      body: "본문",
    });
  });
});

describe("stripLeadingLines (D10, C5)", () => {
  it("제목 줄과 기준 시각 줄을 뗀다", () => {
    expect(stripLeadingLines("\n[2026-11-02 보안]\n\n기준 시각: 2026-11-02 09:30 KST\n\n## 본문")).toEqual({
      body: "## 본문",
      baseTime: "2026-11-02 09:30 KST",
    });
  });

  it("기준 시각 줄만 있어도 뗀다", () => {
    expect(stripLeadingLines("기준 시각: 09:30\n본문").baseTime).toBe("09:30");
  });

  it("형식이 다르면 그대로 둔다", () => {
    expect(stripLeadingLines("## 오늘의 요약\n기준 시각: 09:30")).toEqual({
      body: "## 오늘의 요약\n기준 시각: 09:30",
      baseTime: null,
    });
  });
});

describe("ChatGPT 이전 안내 (generator: chatgpt)", () => {
  const NOTICE = "> 이 보고서는 ChatGPT 예약 작업으로 작성된 것을 옮겨 왔습니다.";
  const raw = (generator: string) =>
    `---\ntitle: "AI·개발 도구 브리핑"\nsummary: "요약"\n${generator}---\n[2026-10-29 AI·개발 도구 브리핑]\n기준 시각: 2026-10-29 08:31 KST\n\n${NOTICE}\n\n## 오늘의 요약\n`;

  it("generator가 chatgpt면 본문 맨 앞의 안내 인용을 떼고 generator를 남긴다", () => {
    const { report } = parseReport(raw("generator: chatgpt\n"), "ai-dev-briefing", "2026-10-29");
    expect(report?.generator).toBe("chatgpt");
    expect(report?.body).toBe("## 오늘의 요약");
  });

  it("generator가 없으면 본문을 그대로 둔다", () => {
    const { report } = parseReport(raw(""), "ai-dev-briefing", "2026-10-29");
    expect(report?.generator).toBeNull();
    expect(report?.body.startsWith(NOTICE)).toBe(true);
  });

  it("본문 중간의 같은 문장이나 다른 인용은 건드리지 않는다", () => {
    expect(stripImportNotice("> 강조 문장\n\n본문")).toBe("> 강조 문장\n\n본문");
    expect(stripImportNotice(`본문\n\n${NOTICE}`)).toBe(`본문\n\n${NOTICE}`);
  });
});
