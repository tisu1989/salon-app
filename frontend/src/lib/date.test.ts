import { describe, expect, it } from "vitest";
import { parseDateInputValue, toDateInputValue } from "./date";

describe("toDateInputValue", () => {
  it("formats a local date as YYYY-MM-DD, zero-padding month and day", () => {
    expect(toDateInputValue(new Date(2026, 0, 5))).toBe("2026-01-05");
    expect(toDateInputValue(new Date(2026, 11, 25))).toBe("2026-12-25");
  });
});

describe("parseDateInputValue", () => {
  it("round-trips with toDateInputValue", () => {
    expect(toDateInputValue(parseDateInputValue("2026-09-27"))).toBe("2026-09-27");
  });

  it("parses as a local date, not UTC - the day-of-week must be correct regardless of timezone", () => {
    // 27 Sep 2026 is a Sunday. `new Date("2026-09-27")` (UTC midnight) would report a
    // different day-of-week than this once converted to a timezone behind UTC - this
    // is the exact bug that hit the backend's availability logic.
    expect(parseDateInputValue("2026-09-27").getDay()).toBe(0);
  });
});
