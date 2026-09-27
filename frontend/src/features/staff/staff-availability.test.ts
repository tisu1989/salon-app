import { describe, expect, it } from "vitest";
import { computeAvailability } from "./staff-availability";

// 2026-09-27 is a Sunday (dayOfWeek 0), 2026-09-28 is a Monday (dayOfWeek 1).
const worksMonToSat = [
  { id: 1, staffId: 2, dayOfWeek: 1, startTime: "09:00", endTime: "18:00" },
  { id: 2, staffId: 2, dayOfWeek: 2, startTime: "09:00", endTime: "18:00" },
];

describe("computeAvailability", () => {
  it("is not-scheduled on a day with no working-hours rule at all", () => {
    expect(computeAvailability("2026-09-27", worksMonToSat, [])).toEqual({
      kind: "not-scheduled",
    });
  });

  it("is working, with the day's actual hours, when there's a rule and no leave", () => {
    expect(computeAvailability("2026-09-28", worksMonToSat, [])).toEqual({
      kind: "working",
      startTime: "09:00",
      endTime: "18:00",
    });
  });

  it("is on-leave when a time-off block overlaps a day they'd otherwise work", () => {
    const timeOff = [
      {
        id: 1,
        staffId: 2,
        startDateTime: "2026-09-28T04:00:00.000Z",
        endDateTime: "2026-09-28T09:00:00.000Z",
        reason: "Dentist appointment",
      },
    ];
    expect(computeAvailability("2026-09-28", worksMonToSat, timeOff)).toEqual({
      kind: "on-leave",
      reason: "Dentist appointment",
      startDateTime: "2026-09-28T04:00:00.000Z",
      endDateTime: "2026-09-28T09:00:00.000Z",
    });
  });

  it("a time-off block on a day with no working-hours rule stays not-scheduled, not on-leave", () => {
    // They don't work Sundays at all - a leave record covering one adds no information.
    const timeOff = [
      {
        id: 2,
        staffId: 2,
        startDateTime: "2026-09-27T00:00:00.000Z",
        endDateTime: "2026-09-27T23:59:59.000Z",
        reason: "Vacation",
      },
    ];
    expect(computeAvailability("2026-09-27", worksMonToSat, timeOff)).toEqual({
      kind: "not-scheduled",
    });
  });

  it("ignores a time-off block on a different day entirely", () => {
    const timeOff = [
      {
        id: 3,
        staffId: 2,
        startDateTime: "2026-09-29T04:00:00.000Z",
        endDateTime: "2026-09-29T09:00:00.000Z",
        reason: null,
      },
    ];
    expect(computeAvailability("2026-09-28", worksMonToSat, timeOff)).toEqual({
      kind: "working",
      startTime: "09:00",
      endTime: "18:00",
    });
  });
});
