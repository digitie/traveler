/**
 * 0 = Sunday, 1 = Monday, ..., 6 = Saturday
 * (matches JavaScript's Date.getDay())
 */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/** Which occurrence within a month: 1st, 2nd, 3rd, 4th, or 5th */
export type WeekOrdinal = 1 | 2 | 3 | 4 | 5;

/** A single recurring rule: every Nth (and Mth...) <weekday> of a month */
export interface RecurringPattern {
  weekday: Weekday;
  ordinals: WeekOrdinal[];
}

export interface MonthDates {
  year: number;
  month: number; // 1-based (1 = January)
  dates: Date[];
}

export interface RecurringResult {
  previous: MonthDates;
  current: MonthDates;
  next: MonthDates;
}
