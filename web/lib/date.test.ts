import { describe, expect, it } from "vitest";
import {
  daysInMonth,
  formatDateKo,
  isLeapYear,
  monthGrid,
  parseDate,
  shiftMonth,
  todayInSeoul,
  weekday,
} from "./date";

describe("날짜 계산 (B2)", () => {
  it("윤년", () => {
    expect([2024, 2026, 2000, 2100].map(isLeapYear)).toEqual([true, false, true, false]);
    expect(daysInMonth(2026, 2)).toBe(28);
    expect(daysInMonth(2028, 2)).toBe(29);
    expect(daysInMonth(2026, 11)).toBe(30);
    expect(daysInMonth(2026, 12)).toBe(31);
  });

  it("형식이 틀리거나 없는 날짜는 null", () => {
    expect(parseDate("2026-11-02")).toEqual({ y: 2026, m: 11, d: 2 });
    expect(parseDate("2026-02-30")).toBeNull();
    expect(parseDate("2026-13-01")).toBeNull();
    expect(parseDate("2026-1-01")).toBeNull();
  });

  it("요일과 한국어 표기", () => {
    expect(weekday(2026, 11, 2)).toBe(1);
    expect(formatDateKo("2026-11-02")).toBe("2026년 11월 2일 (월)");
  });

  it("월 이동은 연도 경계를 넘는다", () => {
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
  });

  it("달력: 2026년 11월은 일요일 시작, 5주", () => {
    const weeks = monthGrid("2026-11");
    expect(weeks).toHaveLength(5);
    expect(weeks[0][0]).toBe("2026-11-01");
    expect(weeks[4].slice(0, 3)).toEqual(["2026-11-29", "2026-11-30", null]);
  });

  it("달력: 2026년 2월은 빈 칸 없이 정확히 4주", () => {
    const weeks = monthGrid("2026-02");
    expect(weeks).toHaveLength(4);
    expect(weeks.flat().every((cell) => cell !== null)).toBe(true);
  });

  it("KST 오늘 날짜는 UTC 날짜와 다를 수 있다", () => {
    expect(todayInSeoul(new Date("2026-11-01T15:30:00Z"))).toBe("2026-11-02");
  });
});
