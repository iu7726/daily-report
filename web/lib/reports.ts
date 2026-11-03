import fs from "node:fs";
import path from "node:path";
import { parse as parseYaml } from "yaml";
import { z } from "zod";
import { isValidDate } from "./date";
import { isLevel, type Level } from "./level";
import { buildTags, decodeTagParam, type TagInfo } from "./tags";
import { TASKS, getTaskInfo, taskOrder } from "./tasks";

export type { Level } from "./level";

export type Report = {
  /** 경로의 작업 폴더 이름 */
  task: string;
  /** 경로의 파일 이름 (KST 날짜) */
  date: string;
  title: string;
  level: Level;
  summary: string;
  /** 검색 결과·공유 카드 제목. 없으면 title */
  headline: string;
  /** 검색 결과 설명. 없으면 summary */
  description: string;
  tags: string[];
  generatedAt: string | null;
  /** 본문 맨 앞 "기준 시각:" 줄의 값 */
  baseTime: string | null;
  /** 보고서를 쓴 도구. ChatGPT에서 옮겨 온 보고서는 "chatgpt", 루틴이 쓴 보고서는 null */
  generator: string | null;
  /** 맨 앞 제목 줄과 기준 시각 줄을 뗀 본문 */
  body: string;
};

export type LoadResult = { reports: Report[]; warnings: string[] };

const TASK_ID_RE = /^[a-z0-9][a-z0-9-]*$/;
const FRONTMATTER_RE = /^---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/;
const TITLE_LINE_RE = /^\[\d{4}-\d{2}-\d{2}[^\]]*\]\s*$/;
const BASE_TIME_RE = /^기준\s*시각\s*[:：]\s*(.+?)\s*$/;
const MAX_TAGS = 10;
/** ChatGPT에서 옮겨 온 보고서 맨 앞의 안내 인용. 사이트는 이 줄 대신 메타 줄에 표시한다. */
const IMPORT_NOTICE_RE = /^>\s*이 보고서는 ChatGPT 예약 작업으로 작성된 것을 옮겨 왔습니다\.?\s*$/;

// 선택 필드가 틀린 값이면 버리고 기본값을 쓴다(기획서 D5). 파일 전체를 버리는 건 frontmatter가 없거나 YAML이 깨진 경우뿐이다.
const optionalText = z.string().trim().min(1).optional().catch(undefined);

const frontmatterSchema = z.object({
  title: optionalText,
  task: optionalText,
  date: optionalText,
  generated_at: optionalText,
  level: optionalText,
  summary: optionalText,
  headline: optionalText,
  description: optionalText,
  generator: optionalText,
  tags: z
    .array(z.union([z.string(), z.number()]).transform((value) => String(value).trim()))
    .optional()
    .catch(undefined),
});

/** 본문 첫 줄이 ChatGPT 이전 안내 인용이면 뗀다. 인용은 강조 상자로 보이므로 메타 정보는 본문에서 뺀다. */
export function stripImportNotice(body: string): string {
  const lines = body.split(/\r?\n/);
  if (lines.length === 0 || !IMPORT_NOTICE_RE.test(lines[0].trim())) return body;
  let i = 1;
  while (i < lines.length && lines[i].trim() === "") i++;
  return lines.slice(i).join("\n");
}

/** 본문 맨 앞의 `[YYYY-MM-DD 제목]` 줄과 `기준 시각:` 줄을 뗀다(기획서 D10). 형식이 다르면 그대로 둔다. */
export function stripLeadingLines(content: string): { body: string; baseTime: string | null } {
  const lines = content.split(/\r?\n/);
  let i = 0;
  const skipBlank = () => {
    while (i < lines.length && lines[i].trim() === "") i++;
  };

  skipBlank();
  if (i < lines.length && TITLE_LINE_RE.test(lines[i].trim())) {
    i++;
    skipBlank();
  }

  let baseTime: string | null = null;
  const baseMatch = i < lines.length ? BASE_TIME_RE.exec(lines[i].trim()) : null;
  if (baseMatch) {
    baseTime = baseMatch[1];
    i++;
  }

  skipBlank();
  return { body: lines.slice(i).join("\n").trimEnd(), baseTime };
}

export function parseReport(
  raw: string,
  task: string,
  date: string,
): { report: Report | null; warnings: string[] } {
  const warnings: string[] = [];
  const source = raw.replace(/^﻿/, "");
  const match = FRONTMATTER_RE.exec(source);
  if (!match) return { report: null, warnings: ["frontmatter가 없어 건너뜀"] };

  let data: unknown;
  try {
    data = parseYaml(match[1]);
  } catch (error) {
    const reason = error instanceof Error ? error.message.split("\n")[0] : String(error);
    return { report: null, warnings: [`frontmatter YAML 오류로 건너뜀: ${reason}`] };
  }
  if (data === null || typeof data !== "object" || Array.isArray(data)) {
    return { report: null, warnings: ["frontmatter가 객체가 아니라 건너뜀"] };
  }

  const fm = frontmatterSchema.parse(data);

  if (fm.task && fm.task !== task) {
    warnings.push(`frontmatter task(${fm.task})가 폴더(${task})와 달라 폴더 기준으로 표시`);
  }
  if (fm.date && fm.date !== date) {
    warnings.push(`frontmatter date(${fm.date})가 파일 이름(${date})과 달라 파일 이름 기준으로 표시`);
  }

  let level: Level = "normal";
  if (isLevel(fm.level)) {
    level = fm.level;
  } else if (fm.level !== undefined) {
    warnings.push(`알 수 없는 level(${fm.level})이라 normal로 표시`);
  }

  const title = fm.title ?? getTaskInfo(task)?.title ?? task;
  const summary = fm.summary ?? "";
  const tags = [...new Set((fm.tags ?? []).filter(Boolean))].slice(0, MAX_TAGS);
  const stripped = stripLeadingLines(source.slice(match[0].length));
  const generator = fm.generator ?? null;
  const body = generator === "chatgpt" ? stripImportNotice(stripped.body) : stripped.body;

  return {
    report: {
      task,
      date,
      title,
      level,
      summary,
      headline: fm.headline ?? title,
      description: fm.description ?? (summary || `${title} ${date}`),
      tags,
      generatedAt: fm.generated_at ?? null,
      baseTime: stripped.baseTime,
      generator,
      body,
    },
    warnings,
  };
}

/** 최신 날짜 먼저, 같은 날은 작업 표시 순서대로. */
export function compareReports(a: Report, b: Report): number {
  if (a.date !== b.date) return a.date < b.date ? 1 : -1;
  const order = taskOrder(a.task) - taskOrder(b.task);
  if (order !== 0) return order;
  return a.task.localeCompare(b.task);
}

const YEAR_RE = /^\d{4}$/;
const MONTH_RE = /^\d{2}$/;
const DAY_FILE_RE = /^(\d{2})\.md$/;

const listDir = (dir: string) => fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name));

/**
 * 작업 폴더 안의 보고서 파일과 날짜를 찾는다.
 * - 현재 구조: `<작업 ID>/YYYY/MM/DD.md`
 * - 예전 구조: `<작업 ID>/YYYY-MM-DD.md` (옮기기 전 파일이나 예전 규칙으로 쓴 파일도 읽는다)
 */
function findReportFiles(taskDir: string, task: string, warnings: string[]) {
  const found: { file: string; where: string; date: string }[] = [];
  const skip = (where: string, why: string) => warnings.push(`${where}: ${why} 건너뜀`);
  const entries = listDir(taskDir);

  // 예전 구조를 먼저 읽고 새 구조를 나중에 읽는다. 같은 날짜가 둘 다 있으면 나중 것(새 구조)이 남는다.
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".md")) continue;
    const where = `${task}/${entry.name}`;
    const date = entry.name.slice(0, -".md".length);
    if (isValidDate(date)) found.push({ file: path.join(taskDir, entry.name), where, date });
    else skip(where, "파일 이름이 YYYY/MM/DD.md(또는 YYYY-MM-DD.md) 형식이 아니라");
  }

  for (const entry of entries) {
    const where = `${task}/${entry.name}`;
    if (!entry.isDirectory()) continue;
    if (!YEAR_RE.test(entry.name)) {
      skip(`${where}/`, "연도 폴더(YYYY)가 아니라");
      continue;
    }
    for (const month of listDir(path.join(taskDir, entry.name))) {
      const monthWhere = `${where}/${month.name}`;
      if (!month.isDirectory() || !MONTH_RE.test(month.name)) {
        if (month.isDirectory() || month.name.endsWith(".md")) skip(monthWhere, "월 폴더(MM)가 아니라");
        continue;
      }
      for (const day of listDir(path.join(taskDir, entry.name, month.name))) {
        if (!day.isFile() || !day.name.endsWith(".md")) continue;
        const dayWhere = `${monthWhere}/${day.name}`;
        const match = DAY_FILE_RE.exec(day.name);
        const date = match ? `${entry.name}-${month.name}-${match[1]}` : "";
        if (match && isValidDate(date)) {
          found.push({ file: path.join(taskDir, entry.name, month.name, day.name), where: dayWhere, date });
        } else {
          skip(dayWhere, "파일 이름이 DD.md 형식이 아니거나 없는 날짜라");
        }
      }
    }
  }
  return found;
}

/** `<dir>/<작업 ID>/YYYY/MM/DD.md`(예전 `YYYY-MM-DD.md`도)를 모두 읽는다. 읽을 수 없는 파일은 경고와 함께 제외한다. */
export function loadReports(dir: string): LoadResult {
  const reports: Report[] = [];
  const warnings: string[] = [];
  if (!fs.existsSync(dir)) return { reports, warnings };

  const taskDirs = listDir(dir)
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);

  for (const task of taskDirs) {
    if (!TASK_ID_RE.test(task)) {
      warnings.push(`${task}/: 작업 ID 형식이 아니라 건너뜀`);
      continue;
    }

    const byDate = new Map<string, Report>();
    for (const { file, where, date } of findReportFiles(path.join(dir, task), task, warnings)) {
      const result = parseReport(fs.readFileSync(file, "utf8"), task, date);
      warnings.push(...result.warnings.map((warning) => `${where}: ${warning}`));
      if (!result.report) continue;
      if (byDate.has(date)) {
        // 같은 날짜가 두 구조에 다 있으면 새 구조(YYYY/MM/DD.md)를 쓴다. 폴더 순서상 새 구조가 나중에 읽힌다.
        warnings.push(`${where}: 같은 날짜(${date}) 보고서가 두 곳에 있어 이 파일을 씀`);
      }
      byDate.set(date, result.report);
    }
    reports.push(...byDate.values());
  }

  reports.sort(compareReports);
  return { reports, warnings };
}

export function getReportsDir(): string {
  const fromEnv = process.env.REPORTS_DIR?.trim();
  return fromEnv ? path.resolve(fromEnv) : path.join(process.cwd(), "..", "reports");
}

let cache: Report[] | undefined;

/** 빌드 중에는 한 번만 읽는다. 개발 서버에서는 보고서를 고치면 바로 반영되도록 매번 읽는다. */
export function getAllReports(): Report[] {
  if (cache && process.env.NODE_ENV === "production") return cache;
  const { reports, warnings } = loadReports(getReportsDir());
  for (const warning of warnings) console.warn(`[reports] ${warning}`);
  cache = reports;
  return reports;
}

export function getReport(task: string, date: string): Report | undefined {
  return getAllReports().find((report) => report.task === task && report.date === date);
}

export function getReportsByTask(task: string): Report[] {
  return getAllReports().filter((report) => report.task === task);
}

export function getReportsByDate(date: string): Report[] {
  return getAllReports().filter((report) => report.date === date);
}

/** 보고서가 있는 날짜, 최신순 */
export function getAllDates(): string[] {
  return [...new Set(getAllReports().map((report) => report.date))];
}

/** 알려진 작업 전부 + 보고서에만 있는 작업 */
export function getAllTaskIds(): string[] {
  const ids = new Set<string>([
    ...TASKS.map((task) => task.id),
    ...getAllReports().map((report) => report.task),
  ]);
  return [...ids].sort((a, b) => taskOrder(a) - taskOrder(b) || a.localeCompare(b));
}

export function getTaskTitle(task: string): string {
  return getTaskInfo(task)?.title ?? getReportsByTask(task)[0]?.title ?? task;
}

/** 같은 작업의 이전(더 오래된)·다음(더 최근) 보고서 */
export function getAdjacentInTask(task: string, date: string): { prev?: Report; next?: Report } {
  const list = getReportsByTask(task);
  const index = list.findIndex((report) => report.date === date);
  if (index === -1) return {};
  return { prev: list[index + 1], next: list[index - 1] };
}

/** 최신순 목록에서 date를 가운데 둔 size개 구간. 앞뒤가 모자라면 반대쪽으로 채우고, 목록이 짧으면 있는 만큼만. */
export function pickAround<T extends { date: string }>(list: T[], date: string, size: number): T[] {
  const index = list.findIndex((item) => item.date === date);
  if (index === -1) return list.slice(0, size);
  const start = Math.max(0, Math.min(index - Math.floor(size / 2), list.length - size));
  return list.slice(start, start + size);
}

/** 보고서가 있는 이전·다음 날짜 */
export function getAdjacentDates(date: string): { prev?: string; next?: string } {
  const dates = getAllDates();
  const index = dates.indexOf(date);
  if (index === -1) return {};
  return { prev: dates[index + 1], next: dates[index - 1] };
}

/** 전체 태그 (많이 쓰인 순) */
export function getAllTags(): TagInfo[] {
  return buildTags(getAllReports());
}

/** 주소 값(인코딩돼 있을 수 있음)으로 태그를 찾는다. */
export function getTag(param: string): TagInfo | undefined {
  const slug = decodeTagParam(param);
  return getAllTags().find((tag) => tag.slug === slug);
}

export type CalendarEntry = { task: string; level: Level };

/** 캘린더용 가벼운 목록: 날짜 → [{작업, level}] */
export function getCalendarEntries(): Record<string, CalendarEntry[]> {
  const entries: Record<string, CalendarEntry[]> = {};
  for (const report of getAllReports()) {
    (entries[report.date] ??= []).push({ task: report.task, level: report.level });
  }
  return entries;
}
