import { describe, expect, it } from "vitest";
import { toDateInputValue } from "./date";

describe("toDateInputValue", () => {
  it("formats a local date as YYYY-MM-DD, zero-padding month and day", () => {
    expect(toDateInputValue(new Date(2026, 0, 5))).toBe("2026-01-05");
    expect(toDateInputValue(new Date(2026, 11, 25))).toBe("2026-12-25");
  });
});
