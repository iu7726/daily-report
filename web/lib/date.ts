// 날짜는 `YYYY-MM-DD`(KST 기준 날짜) 문자열로만 다룬다(기획서 D6).
// `new Date('YYYY-MM-DD')`는 UTC 자정으로 해석돼 빌드 서버(UTC)에서 하루가 밀릴 수 있어 쓰지 않는다.

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const MONTH_RE = /^(\d{4})-(\d{2})$/;

export const WEEKDAYS_KO = ["일", "월", "화", "수", "목", "금", "토"] as const;

export type YMD = { y: number; m: number; d: number };

export function isLeapYear(y: number): boolean {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}

/** m은 1~12 */
export function daysInMonth(y: number, m: number): number {
  if (m === 2) return isLeapYear(y) ? 29 : 28;
  return [4, 6, 9, 11].includes(m) ? 30 : 31;
}

export function parseDate(value: string): YMD | null {
  const match = DATE_RE.exec(value);
  if (!match) return null;
  const [y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])];
  if (m < 1 || m > 12 || d < 1 || d > daysInMonth(y, m)) return null;
  return { y, m, d };
}

export function isValidDate(value: string): boolean {
  return parseDate(value) !== null;
}

const pad2 = (n: number) => String(n).padStart(2, "0");

export function toDateString({ y, m, d }: YMD): string {
  return `${y}-${pad2(m)}-${pad2(d)}`;
}

/** 0 = 일요일. 달력 계산이라 시간대와 무관하도록 UTC 기준으로 구한다. */
export function weekday(y: number, m: number, d: number): number {
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** "2026년 11월 2일 (월)" */
export function formatDateKo(value: string): string {
  const p = parseDate(value);
  if (!p) return value;
  return `${p.y}년 ${p.m}월 ${p.d}일 (${WEEKDAYS_KO[weekday(p.y, p.m, p.d)]})`;
}

/** "11월 2일 (월)" */
export function formatDateShortKo(value: string): string {
  const p = parseDate(value);
  if (!p) return value;
  return `${p.m}월 ${p.d}일 (${WEEKDAYS_KO[weekday(p.y, p.m, p.d)]})`;
}

/** "YYYY-MM-DD" → "YYYY-MM" */
export function monthKeyOf(value: string): string {
  return value.slice(0, 7);
}

export function parseMonth(key: string): { y: number; m: number } | null {
  const match = MONTH_RE.exec(key);
  if (!match) return null;
  const [y, m] = [Number(match[1]), Number(match[2])];
  if (m < 1 || m > 12) return null;
  return { y, m };
}

export function shiftMonth(key: string, delta: number): string {
  const p = parseMonth(key);
  if (!p) return key;
  const index = p.y * 12 + (p.m - 1) + delta;
  return `${Math.floor(index / 12)}-${pad2((index % 12) + 1)}`;
}

/** "2026년 11월" */
export function formatMonthKo(key: string): string {
  const p = parseMonth(key);
  return p ? `${p.y}년 ${p.m}월` : key;
}

/** 일요일 시작 주 단위 달력. 빈 칸은 null. */
export function monthGrid(key: string): (string | null)[][] {
  const p = parseMonth(key);
  if (!p) return [];
  const cells: (string | null)[] = Array(weekday(p.y, p.m, 1)).fill(null);
  for (let d = 1; d <= daysInMonth(p.y, p.m); d++) {
    cells.push(toDateString({ y: p.y, m: p.m, d }));
  }
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: (string | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

/** 브라우저에서 현재 KST 날짜. 서버 렌더링 결과와 어긋나지 않게 클라이언트 effect 안에서만 쓴다. */
export function todayInSeoul(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}
