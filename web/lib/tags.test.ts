import { describe, expect, it } from "vitest";
import type { Report } from "./reports";
import { buildTags, decodeTagParam, slugifyTag } from "./tags";

const report = (date: string, task: string, tags: string[]): Report => ({
  task,
  date,
  tags,
  title: task,
  level: "normal",
  summary: "",
  headline: task,
  description: "",
  generatedAt: null,
  baseTime: null,
  body: "",
});

describe("slugifyTag (D1)", () => {
  it.each([
    ["Node.js", "nodejs"],
    ["node.js", "nodejs"],
    ["NodeJS", "nodejs"],
    ["Next.js", "nextjs"],
    ["Claude Code", "claude-code"],
    ["미국 국채", "미국-국채"],
    ["CVE-2026-111497", "cve-2026-111497"],
    ["S&P500", "sp500"],
    ["CISA KEV", "cisa-kev"],
    ["GitLab CI/CD", "gitlab-ci-cd"],
    ["C++", "c++"],
    ["  OpenAI   Codex ", "openai-codex"],
    ["MCP (Model Context Protocol)", "mcp-model-context-protocol"],
  ])("%s → %s", (tag, slug) => {
    expect(slugifyTag(tag)).toBe(slug);
  });

  it("기호만 있으면 빈 문자열 (T2)", () => {
    expect(slugifyTag("...")).toBe("");
    expect(slugifyTag(" & ")).toBe("");
  });
});

describe("buildTags", () => {
  const reports = [
    report("2026-11-03", "security-daily-report", ["Node.js", "NodeJS", "GitLab"]),
    report("2026-11-02", "ai-dev-briefing", ["node.js", "Claude Code", "..."]),
    report("2026-11-01", "security-daily-report", ["NodeJS", "미국 국채"]),
  ];
  const tags = buildTags(reports);
  const find = (slug: string) => tags.find((tag) => tag.slug === slug);

  it("표기만 다른 태그를 합치고, 한 보고서 안의 중복은 한 번만 센다 (T1, T7)", () => {
    expect(find("nodejs")?.reports.map((r) => r.date)).toEqual(["2026-11-03", "2026-11-02", "2026-11-01"]);
  });

  it("표시 이름은 가장 많이 쓰인 표기, 같으면 최근 표기 (D2)", () => {
    // NodeJS 2회(11-03, 11-01), Node.js 1회, node.js 1회
    expect(find("nodejs")?.name).toBe("NodeJS");
    const tie = buildTags([report("2026-11-02", "a", ["Next.js"]), report("2026-11-01", "a", ["NextJS"])]);
    expect(tie[0].name).toBe("Next.js");
  });

  it("보고서 2건 이상만 색인 대상 (D3)", () => {
    expect(find("nodejs")?.indexable).toBe(true);
    expect(find("gitlab")?.indexable).toBe(false);
  });

  it("빈 slug는 버리고, 많이 쓰인 순 → 이름순(한국어 정렬: 한글 먼저)으로 정렬한다 (T2)", () => {
    expect(tags.map((tag) => tag.slug)).toEqual(["nodejs", "미국-국채", "claude-code", "gitlab"]);
  });

  it("태그가 없으면 빈 목록 (T5)", () => {
    expect(buildTags([report("2026-11-02", "a", [])])).toEqual([]);
  });
});

describe("decodeTagParam (T3)", () => {
  it("인코딩된 한글 주소 값을 되돌린다", () => {
    expect(decodeTagParam(encodeURIComponent("미국-국채"))).toBe("미국-국채");
    expect(decodeTagParam("미국-국채")).toBe("미국-국채");
    expect(decodeTagParam("%E0%A4%A")).toBe("%E0%A4%A");
  });
});
