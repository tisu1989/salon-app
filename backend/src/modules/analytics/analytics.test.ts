import { describe, expect, it } from "vitest";
import { summarizeAppointments } from "./analytics.js";

const rangeStart = new Date(2026, 8, 21); // Mon 21 Sep 2026, local midnight

function apt(
  daysOffset: number,
  hour: number,
  status: "BOOKED" | "CONFIRMED" | "CANCELLED" | "COMPLETED" | "NO_SHOW",
) {
  const startTime = new Date(rangeStart);
  startTime.setDate(startTime.getDate() + daysOffset);
  startTime.setHours(hour, 0, 0, 0);
  return { startTime, status };
}

describe("summarizeAppointments", () => {
  it("seeds every day in the range with zero, even with no appointments at all", () => {
    const summary = summarizeAppointments([], rangeStart, 3);

    expect(summary.bookingsByDay).toEqual([
      { date: "2026-09-21", count: 0 },
      { date: "2026-09-22", count: 0 },
      { date: "2026-09-23", count: 0 },
    ]);
    expect(summary.range).toEqual({ days: 3, from: "2026-09-21", to: "2026-09-23" });
  });

  it("counts each appointment on the calendar day it actually starts", () => {
    const summary = summarizeAppointments(
      [apt(0, 9, "COMPLETED"), apt(0, 14, "COMPLETED"), apt(2, 10, "BOOKED")],
      rangeStart,
      3,
    );

    expect(summary.bookingsByDay).toEqual([
      { date: "2026-09-21", count: 2 },
      { date: "2026-09-22", count: 0 },
      { date: "2026-09-23", count: 1 },
    ]);
  });

  it("buckets by hour of day across the whole range, all 24 hours present", () => {
    const summary = summarizeAppointments(
      [apt(0, 9, "COMPLETED"), apt(1, 9, "COMPLETED"), apt(2, 15, "BOOKED")],
      rangeStart,
      3,
    );

    expect(summary.busiestHours).toHaveLength(24);
    expect(summary.busiestHours[9]).toEqual({ hour: 9, count: 2 });
    expect(summary.busiestHours[15]).toEqual({ hour: 15, count: 1 });
    expect(summary.busiestHours[0]).toEqual({ hour: 0, count: 0 });
  });

  it("counts every status, including ones that never happened", () => {
    const summary = summarizeAppointments(
      [
        apt(0, 9, "BOOKED"),
        apt(0, 10, "CANCELLED"),
        apt(0, 11, "COMPLETED"),
        apt(0, 12, "NO_SHOW"),
      ],
      rangeStart,
      1,
    );

    expect(summary.statusBreakdown).toEqual({
      BOOKED: 1,
      CONFIRMED: 0,
      CANCELLED: 1,
      COMPLETED: 1,
      NO_SHOW: 1,
    });
  });

  it("no-show rate only counts appointments that actually happened (completed or no-show)", () => {
    const summary = summarizeAppointments(
      [
        apt(0, 9, "BOOKED"), // hasn't happened yet - shouldn't affect the rate
        apt(0, 10, "CANCELLED"), // cancelled, not a no-show - shouldn't affect the rate
        apt(0, 11, "COMPLETED"),
        apt(0, 12, "NO_SHOW"),
      ],
      rangeStart,
      1,
    );

    // 1 no-show out of 2 resolved appointments (1 completed + 1 no-show) = 0.5, not 1/4.
    expect(summary.noShowRate).toBe(0.5);
  });

  it("no-show rate is 0, not NaN, when nothing has been resolved yet", () => {
    const summary = summarizeAppointments([apt(0, 9, "BOOKED")], rangeStart, 1);
    expect(summary.noShowRate).toBe(0);
  });

  it("ignores an appointment that falls outside the seeded range rather than creating an extra bucket", () => {
    const outsideRange = apt(10, 9, "COMPLETED"); // 10 days after a 3-day range
    const summary = summarizeAppointments([outsideRange], rangeStart, 3);

    expect(summary.bookingsByDay).toHaveLength(3);
    expect(summary.bookingsByDay.every((d) => d.count === 0)).toBe(true);
    // Hour and status counts are range-agnostic by design (the repo query already scopes
    // rows to the range before this function ever sees them) - still counted here.
    expect(summary.statusBreakdown.COMPLETED).toBe(1);
  });
});
