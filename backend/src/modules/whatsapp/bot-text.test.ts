import { describe, expect, it } from "vitest";
import {
  formatTime24h,
  isResetCommand,
  parseRequestedDate,
  resolveNumberedSelection,
} from "./bot-text.js";

describe("isResetCommand", () => {
  it("recognizes reset phrases regardless of case/whitespace", () => {
    expect(isResetCommand("cancel")).toBe(true);
    expect(isResetCommand("  RESTART ")).toBe(true);
    expect(isResetCommand("Menu")).toBe(true);
  });

  it("rejects anything else", () => {
    expect(isResetCommand("2")).toBe(false);
    expect(isResetCommand("hi")).toBe(false);
  });
});

describe("resolveNumberedSelection", () => {
  const options = ["Haircut", "Manicure", "Massage"];

  it("resolves a valid 1-based number to the matching option", () => {
    expect(resolveNumberedSelection("1", options)).toBe("Haircut");
    expect(resolveNumberedSelection("3", options)).toBe("Massage");
  });

  it("returns null for out-of-range, non-numeric, or blank input", () => {
    expect(resolveNumberedSelection("0", options)).toBeNull();
    expect(resolveNumberedSelection("4", options)).toBeNull();
    expect(resolveNumberedSelection("yes", options)).toBeNull();
    expect(resolveNumberedSelection("", options)).toBeNull();
  });
});

describe("parseRequestedDate", () => {
  const now = new Date(2026, 5, 15); // June 15, 2026 (Monday)

  it("parses 'today' and 'tomorrow'", () => {
    expect(parseRequestedDate("today", now)).toEqual(new Date(2026, 5, 15));
    expect(parseRequestedDate("TOMORROW", now)).toEqual(new Date(2026, 5, 16));
  });

  it("parses a DD-MM date later this year", () => {
    expect(parseRequestedDate("25-12", now)).toEqual(new Date(2026, 11, 25));
  });

  it("rolls a DD-MM date that's already passed this year into next year", () => {
    expect(parseRequestedDate("01-01", now)).toEqual(new Date(2027, 0, 1));
  });

  it("accepts '/' as a separator", () => {
    expect(parseRequestedDate("25/12", now)).toEqual(new Date(2026, 11, 25));
  });

  it("rejects invalid dates and unparseable text", () => {
    expect(parseRequestedDate("31-04", now)).toBeNull(); // April has 30 days
    expect(parseRequestedDate("13-13", now)).toBeNull();
    expect(parseRequestedDate("whenever", now)).toBeNull();
  });
});

describe("formatTime24h", () => {
  it("pads single-digit hours and minutes", () => {
    const d = new Date(2026, 0, 1, 9, 5);
    expect(formatTime24h(d)).toBe("09:05");
  });

  it("formats afternoon times in 24h form", () => {
    const d = new Date(2026, 0, 1, 17, 30);
    expect(formatTime24h(d)).toBe("17:30");
  });
});
