import { getOccurrencesInMonth, resolve, resolveMultiple } from "./resolver";
import { pattern, parsePattern } from "./pattern-builder";

// Fixed base date for deterministic tests: 2026-04-27 (Monday)
const BASE = new Date(2026, 3, 27); // April 27, 2026

function fmt(d: Date): string {
  return d.toISOString().slice(0, 10);
}

describe("getOccurrencesInMonth", () => {
  test("every 3rd Monday of April 2026", () => {
    const p = pattern().every(3).monday().build();
    const dates = getOccurrencesInMonth(2026, 4, p).map(fmt);
    // Mondays in Apr 2026: 6, 13, 20, 27 → 3rd = 20
    expect(dates).toEqual(["2026-04-20"]);
  });

  test("every 2nd and 4th Sunday of April 2026", () => {
    const p = pattern().every(2, 4).sunday().build();
    const dates = getOccurrencesInMonth(2026, 4, p).map(fmt);
    // Sundays in Apr 2026: 5, 12, 19, 26 → 2nd=12, 4th=26
    expect(dates).toEqual(["2026-04-12", "2026-04-26"]);
  });

  test("every 1st and 3rd Wednesday of March 2026", () => {
    const p = pattern().every(1, 3).wednesday().build();
    const dates = getOccurrencesInMonth(2026, 3, p).map(fmt);
    // Wednesdays in Mar 2026: 4, 11, 18, 25 → 1st=4, 3rd=18
    expect(dates).toEqual(["2026-03-04", "2026-03-18"]);
  });

  test("ordinal beyond count is silently skipped (Feb has at most 4 Sundays in non-leap years)", () => {
    const p = pattern().every(5).sunday().build();
    // Feb 2026: Sundays are 1, 8, 15, 22 — no 5th Sunday
    const dates = getOccurrencesInMonth(2026, 2, p).map(fmt);
    expect(dates).toEqual([]);
  });

  test("5th occurrence when it exists", () => {
    const p = pattern().every(5).monday().build();
    // Mondays in Mar 2026: 2, 9, 16, 23, 30 → 5th = 30
    const dates = getOccurrencesInMonth(2026, 3, p).map(fmt);
    expect(dates).toEqual(["2026-03-30"]);
  });
});

describe("resolve — previous / current / next", () => {
  test("3rd Monday relative to 2026-04-27", () => {
    const p = pattern().every(3).monday().build();
    const result = resolve(p, BASE);

    // previous = March 2026: Mondays 2,9,16,23,30 → 3rd = 16
    expect(result.previous).toMatchObject({ year: 2026, month: 3 });
    expect(result.previous.dates.map(fmt)).toEqual(["2026-03-16"]);

    // current = April 2026: Mondays 6,13,20,27 → 3rd = 20
    expect(result.current).toMatchObject({ year: 2026, month: 4 });
    expect(result.current.dates.map(fmt)).toEqual(["2026-04-20"]);

    // next = May 2026: Mondays 4,11,18,25 → 3rd = 18
    expect(result.next).toMatchObject({ year: 2026, month: 5 });
    expect(result.next.dates.map(fmt)).toEqual(["2026-05-18"]);
  });

  test("2nd and 4th Sunday relative to 2026-04-27", () => {
    const p = pattern().every(2, 4).sunday().build();
    const result = resolve(p, BASE);

    // previous = March 2026: Sundays 1,8,15,22,29 → 2nd=8, 4th=22
    expect(result.previous.dates.map(fmt)).toEqual(["2026-03-08", "2026-03-22"]);

    // current = April 2026: Sundays 5,12,19,26 → 2nd=12, 4th=26
    expect(result.current.dates.map(fmt)).toEqual(["2026-04-12", "2026-04-26"]);

    // next = May 2026: Sundays 3,10,17,24,31 → 2nd=10, 4th=24
    expect(result.next.dates.map(fmt)).toEqual(["2026-05-10", "2026-05-24"]);
  });

  test("month boundary wraps correctly across year (December → January)", () => {
    const dec = new Date(2025, 11, 15); // December 2025
    const p = pattern().every(1).friday().build();
    const result = resolve(p, dec);

    expect(result.previous).toMatchObject({ year: 2025, month: 11 });
    expect(result.current).toMatchObject({ year: 2025, month: 12 });
    expect(result.next).toMatchObject({ year: 2026, month: 1 });
  });
});

describe("resolveMultiple — merge two patterns", () => {
  test("3rd Monday + 2nd/4th Sunday for April 2026", () => {
    const patterns = [
      pattern().every(3).monday().build(),
      pattern().every(2, 4).sunday().build(),
    ];
    const result = resolveMultiple(patterns, BASE);
    // April: Mon 20, Sun 12, Sun 26 → sorted: 12, 20, 26
    expect(result.current.dates.map(fmt)).toEqual(["2026-04-12", "2026-04-20", "2026-04-26"]);
  });
});

describe("parsePattern", () => {
  test("Korean: 셋째주 월요일", () => {
    const p = parsePattern("셋째주 월요일");
    expect(p).toEqual({ weekday: 1, ordinals: [3] });
  });

  test("Korean: 두번째 네번째 일요일", () => {
    const p = parsePattern("두번째 네번째 일요일");
    expect(p).toEqual({ weekday: 0, ordinals: [2, 4] });
  });

  test("English: 3rd monday", () => {
    const p = parsePattern("3rd monday");
    expect(p).toEqual({ weekday: 1, ordinals: [3] });
  });

  test("English: 2nd and 4th sunday", () => {
    const p = parsePattern("2nd and 4th sunday");
    expect(p).toEqual({ weekday: 0, ordinals: [2, 4] });
  });

  test("throws on unknown weekday", () => {
    expect(() => parsePattern("3rd funday")).toThrow();
  });

  test("throws on missing ordinal", () => {
    expect(() => parsePattern("monday")).toThrow();
  });
});
