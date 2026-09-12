import { describe, expect, it } from "vitest";
import { MAX_SEND_ATTEMPTS, hasExceededMaxAttempts, isDueForRetry } from "./retry-policy.js";

describe("isDueForRetry", () => {
  it("is always due for a first-time send (0 attempts, never attempted)", () => {
    expect(isDueForRetry(0, null)).toBe(true);
  });

  it("is not due immediately after a first failed attempt (60s backoff)", () => {
    const now = new Date(2026, 0, 1, 12, 0, 0);
    const lastAttemptAt = new Date(2026, 0, 1, 12, 0, 30); // 30s ago
    expect(isDueForRetry(1, lastAttemptAt, now)).toBe(false);
  });

  it("is due once the backoff for that attempt count has elapsed", () => {
    const lastAttemptAt = new Date(2026, 0, 1, 12, 0, 0);
    const exactlyDue = new Date(2026, 0, 1, 12, 1, 0); // 60s later, matches the 1st backoff tier
    expect(isDueForRetry(1, lastAttemptAt, exactlyDue)).toBe(true);
  });

  it("uses a longer backoff for later attempts", () => {
    const lastAttemptAt = new Date(2026, 0, 1, 12, 0, 0);
    const after90s = new Date(2026, 0, 1, 12, 1, 30);
    // 1st retry's 60s backoff has elapsed...
    expect(isDueForRetry(1, lastAttemptAt, after90s)).toBe(true);
    // ...but the 2nd retry's 5-minute backoff hasn't.
    expect(isDueForRetry(2, lastAttemptAt, after90s)).toBe(false);
  });

  it("caps the backoff at the longest tier for attempts beyond the schedule", () => {
    const lastAttemptAt = new Date(2026, 0, 1, 12, 0, 0);
    const after30min = new Date(2026, 0, 1, 12, 30, 0);
    const after61min = new Date(2026, 0, 1, 13, 1, 0);
    // Far beyond the schedule's length - still bound by the last (1hr) tier, not "due forever".
    expect(isDueForRetry(99, lastAttemptAt, after30min)).toBe(false);
    expect(isDueForRetry(99, lastAttemptAt, after61min)).toBe(true);
  });
});

describe("hasExceededMaxAttempts", () => {
  it("has not exceeded below the max", () => {
    expect(hasExceededMaxAttempts(MAX_SEND_ATTEMPTS - 1)).toBe(false);
  });

  it("has exceeded at or above the max", () => {
    expect(hasExceededMaxAttempts(MAX_SEND_ATTEMPTS)).toBe(true);
    expect(hasExceededMaxAttempts(MAX_SEND_ATTEMPTS + 1)).toBe(true);
  });
});
