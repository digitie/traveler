import type { Weekday, WeekOrdinal, RecurringPattern, MonthDates, RecurringResult } from "./types";

/**
 * Returns all dates in the given year/month that match the specified weekday and ordinals.
 * month is 1-based (1 = January, 12 = December).
 */
export function getOccurrencesInMonth(
  year: number,
  month: number,
  pattern: RecurringPattern
): Date[] {
  const { weekday, ordinals } = pattern;

  // Collect all dates in the month that fall on the target weekday
  const allMatchingDates: Date[] = [];
  const daysInMonth = new Date(year, month, 0).getDate();

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month - 1, day);
    if (date.getDay() === weekday) {
      allMatchingDates.push(date);
    }
  }

  // Pick by ordinal (1-based index into the matching dates array)
  const result: Date[] = [];
  for (const ordinal of ordinals) {
    const idx = ordinal - 1;
    if (idx < allMatchingDates.length) {
      result.push(allMatchingDates[idx]);
    }
  }

  return result.sort((a, b) => a.getTime() - b.getTime());
}

function resolveMonth(year: number, month: number, pattern: RecurringPattern): MonthDates {
  return {
    year,
    month,
    dates: getOccurrencesInMonth(year, month, pattern),
  };
}

function addMonths(year: number, month: number, delta: number): { year: number; month: number } {
  const d = new Date(year, month - 1 + delta, 1);
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

/**
 * Given a recurring pattern, returns matching dates for the previous, current,
 * and next month relative to `baseDate` (defaults to today).
 */
export function resolve(pattern: RecurringPattern, baseDate: Date = new Date()): RecurringResult {
  const baseYear = baseDate.getFullYear();
  const baseMonth = baseDate.getMonth() + 1;

  const prev = addMonths(baseYear, baseMonth, -1);
  const next = addMonths(baseYear, baseMonth, 1);

  return {
    previous: resolveMonth(prev.year, prev.month, pattern),
    current: resolveMonth(baseYear, baseMonth, pattern),
    next: resolveMonth(next.year, next.month, pattern),
  };
}

/**
 * Convenience: resolve multiple patterns at once and merge results per month.
 */
export function resolveMultiple(
  patterns: RecurringPattern[],
  baseDate: Date = new Date()
): RecurringResult {
  const baseYear = baseDate.getFullYear();
  const baseMonth = baseDate.getMonth() + 1;

  const prev = addMonths(baseYear, baseMonth, -1);
  const next = addMonths(baseYear, baseMonth, 1);

  function mergeMonth(year: number, month: number): MonthDates {
    const allDates = patterns.flatMap((p) => getOccurrencesInMonth(year, month, p));
    // Deduplicate by time value and sort
    const unique = Array.from(new Map(allDates.map((d) => [d.getTime(), d])).values()).sort(
      (a, b) => a.getTime() - b.getTime()
    );
    return { year, month, dates: unique };
  }

  return {
    previous: mergeMonth(prev.year, prev.month),
    current: mergeMonth(baseYear, baseMonth),
    next: mergeMonth(next.year, next.month),
  };
}
