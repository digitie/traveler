import type { Weekday, WeekOrdinal, RecurringPattern } from "./types";

const WEEKDAY_MAP: Record<string, Weekday> = {
  sunday: 0, sun: 0, 일요일: 0, 일: 0,
  monday: 1, mon: 1, 월요일: 1, 월: 1,
  tuesday: 2, tue: 2, 화요일: 2, 화: 2,
  wednesday: 3, wed: 3, 수요일: 3, 수: 3,
  thursday: 4, thu: 4, 목요일: 4, 목: 4,
  friday: 5, fri: 5, 금요일: 5, 금: 5,
  saturday: 6, sat: 6, 토요일: 6, 토: 6,
};

const ORDINAL_MAP: Record<string, WeekOrdinal> = {
  first: 1, "1st": 1, "1": 1, 첫: 1, 첫번째: 1, 첫째: 1,
  second: 2, "2nd": 2, "2": 2, 두: 2, 두번째: 2, 둘째: 2,
  third: 3, "3rd": 3, "3": 3, 세: 3, 세번째: 3, 셋째: 3,
  fourth: 4, "4th": 4, "4": 4, 네: 4, 네번째: 4, 넷째: 4,
  fifth: 5, "5th": 5, "5": 5, 다섯: 5, 다섯번째: 5, 다섯째: 5,
};

/**
 * Fluent builder for RecurringPattern.
 *
 * Examples:
 *   pattern().every(3).monday().build()
 *   pattern().every(2, 4).sunday().build()
 *   pattern().weekday('월').ordinals(1, 3).build()
 */
export class PatternBuilder {
  private _weekday?: Weekday;
  private _ordinals: WeekOrdinal[] = [];

  every(...ordinals: (WeekOrdinal | number)[]): this {
    this._ordinals = ordinals.map((o) => {
      if (o < 1 || o > 5) throw new RangeError(`Ordinal must be 1–5, got ${o}`);
      return o as WeekOrdinal;
    });
    return this;
  }

  ordinals(...ordinals: (WeekOrdinal | number)[]): this {
    return this.every(...ordinals);
  }

  weekday(day: string | Weekday): this {
    if (typeof day === "number") {
      if (day < 0 || day > 6) throw new RangeError(`Weekday must be 0–6, got ${day}`);
      this._weekday = day as Weekday;
    } else {
      const resolved = WEEKDAY_MAP[day.toLowerCase()];
      if (resolved === undefined) throw new Error(`Unknown weekday: "${day}"`);
      this._weekday = resolved;
    }
    return this;
  }

  // Weekday shortcuts
  sunday(): this    { return this.weekday(0); }
  monday(): this    { return this.weekday(1); }
  tuesday(): this   { return this.weekday(2); }
  wednesday(): this { return this.weekday(3); }
  thursday(): this  { return this.weekday(4); }
  friday(): this    { return this.weekday(5); }
  saturday(): this  { return this.weekday(6); }

  build(): RecurringPattern {
    if (this._weekday === undefined) throw new Error("Weekday is required");
    if (this._ordinals.length === 0) throw new Error("At least one ordinal is required");
    return { weekday: this._weekday, ordinals: [...this._ordinals] };
  }
}

/** Factory shortcut */
export function pattern(): PatternBuilder {
  return new PatternBuilder();
}

/**
 * Parse a natural-language string into a RecurringPattern.
 * Supports both Korean and English keywords.
 *
 * Examples:
 *   "3rd monday"
 *   "2nd and 4th sunday"
 *   "셋째주 월요일"
 *   "두번째 네번째 일요일"
 */
export function parsePattern(text: string): RecurringPattern {
  const lower = text.toLowerCase();

  // Match longest key first to avoid "일" matching inside "월요일"
  const weekdayEntries = Object.entries(WEEKDAY_MAP).sort((a, b) => b[0].length - a[0].length);
  let foundWeekday: Weekday | undefined;
  for (const [key, value] of weekdayEntries) {
    if (lower.includes(key)) {
      foundWeekday = value;
      break;
    }
  }
  if (foundWeekday === undefined) throw new Error(`No weekday found in: "${text}"`);

  // Match longest ordinal key first to avoid partial matches
  const ordinalEntries = Object.entries(ORDINAL_MAP).sort((a, b) => b[0].length - a[0].length);
  const foundOrdinals: WeekOrdinal[] = [];
  for (const [key, value] of ordinalEntries) {
    if (lower.includes(key)) {
      if (!foundOrdinals.includes(value)) foundOrdinals.push(value);
    }
  }
  if (foundOrdinals.length === 0) throw new Error(`No ordinals found in: "${text}"`);

  return { weekday: foundWeekday, ordinals: foundOrdinals.sort((a, b) => a - b) };
}
