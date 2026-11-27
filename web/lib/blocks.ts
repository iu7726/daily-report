import { isLevel, type Level } from "./level";

/**
 * 보고서 그림 블록 해석(기획서 2026-11-27_report-visuals R1).
 * 루틴은 코드 블록 언어로 데이터만 쓰고, 사이트가 그림으로 그린다. GitHub에서는 글자 그대로 보여도 읽히는 줄 형식이다.
 * 형식이 틀리면 null을 돌려주고, 사이트는 원래 코드 블록을 그대로 보여 준다.
 * 형식을 바꾸면 `scheduler/CLAUDE.md`의 '그림'과 `scheduler/scripts/report_lint.py`도 같이 바꾼다.
 */
export const BLOCK_LANGUAGES = ["timeline", "flow", "trend"] as const;
export type BlockLanguage = (typeof BLOCK_LANGUAGES)[number];

export function isBlockLanguage(value: string): value is BlockLanguage {
  return (BLOCK_LANGUAGES as readonly string[]).includes(value);
}

export const TIMELINE_MAX = 12;
export const FLOW_MIN = 2;
export const FLOW_MAX = 7;
export const TREND_MAX = 6;

export type TimelineEvent = { when: string; text: string; level: Level | null };

const lines = (source: string) =>
  source
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

/** `- <시각> | <내용> | <수준>` 줄 2개 이상. 수준(urgent·notice·normal)은 생략할 수 있다. */
export function parseTimeline(source: string): TimelineEvent[] | null {
  const rows = lines(source);
  if (rows.length < 2 || rows.length > TIMELINE_MAX) return null;
  const events: TimelineEvent[] = [];
  for (const row of rows) {
    const parts = row
      .replace(/^[-*]\s+/, "")
      .split("|")
      .map((part) => part.trim());
    if (parts.length < 2 || parts.length > 3 || !parts[0] || !parts[1]) return null;
    let level: Level | null = null;
    if (parts.length === 3) {
      if (!isLevel(parts[2])) return null;
      level = parts[2];
    }
    events.push({ when: parts[0], text: parts[1], level });
  }
  return events;
}

/** 한 줄에 단계 하나, 2~7단계. 줄 앞의 `-`나 `1.`은 뗀다. */
export function parseFlow(source: string): string[] | null {
  const steps = lines(source).map((line) => line.replace(/^([-*]|\d+[.)])\s+/, "").trim());
  if (steps.some((step) => !step)) return null;
  return steps.length >= FLOW_MIN && steps.length <= FLOW_MAX ? steps : null;
}

/** 쉼표나 줄바꿈으로 나눈 `metrics` 키 1~6개 */
export function parseTrend(source: string): string[] | null {
  const keys = source
    .split(/[,\n]/)
    .map((key) => key.trim())
    .filter(Boolean);
  if (keys.length === 0 || keys.length > TREND_MAX) return null;
  if (!keys.every((key) => /^[a-z][a-z0-9_]*$/.test(key))) return null;
  return [...new Set(keys)];
}

/** 인라인 코드(`…`)만 나눈다. 블록 안 글자는 마크다운을 해석하지 않고 코드 표기만 살린다. */
export function splitInlineCode(text: string): { code: boolean; text: string }[] {
  const out: { code: boolean; text: string }[] = [];
  const re = /`([^`]+)`/g;
  let last = 0;
  for (let m = re.exec(text); m; m = re.exec(text)) {
    if (m.index > last) out.push({ code: false, text: text.slice(last, m.index) });
    out.push({ code: true, text: m[1] });
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push({ code: false, text: text.slice(last) });
  return out;
}
