import { describe, expect, it } from "vitest";
import { getAvailableSlots, type WorkingHoursRule } from "./availability.js";

// Wednesday, Jan 7 2026 - arbitrary fixed date so tests are deterministic
const WEDNESDAY = new Date(2026, 0, 7);

const staffWorksWednesdays9to5: WorkingHoursRule[] = [
  { dayOfWeek: 3, startTime: "09:00", endTime: "17:00" }, // 3 = Wednesday
];

function at(hours: number, minutes = 0): Date {
  const d = new Date(WEDNESDAY);
  d.setHours(hours, minutes, 0, 0);
  return d;
}

describe("getAvailableSlots", () => {
  it("returns slots across the full day when nothing is booked", () => {
    const slots = getAvailableSlots({
      date: WEDNESDAY,
      workingHours: staffWorksWednesdays9to5,
      timeOff: [],
      existingAppointments: [],
      serviceDurationMinutes: 60,
      slotIntervalMinutes: 60, // hourly steps, easy to reason about
    });

    // 9-17 with 60 min service, hourly steps -> last valid start is 16:00
    expect(slots[0]?.start).toEqual(at(9));
    expect(slots.at(-1)?.start).toEqual(at(16));
    expect(slots).toHaveLength(8);
  });

  it("excludes slots that overlap an existing appointment in the middle of the day", () => {
    const slots = getAvailableSlots({
      date: WEDNESDAY,
      workingHours: staffWorksWednesdays9to5,
      timeOff: [],
      existingAppointments: [{ start: at(12), end: at(13) }],
      serviceDurationMinutes: 60,
      slotIntervalMinutes: 60,
    });

    const startsAtNoon = slots.some((s) => s.start.getTime() === at(12).getTime());
    expect(startsAtNoon).toBe(false);

    // Neighbouring slots should still be free
    expect(slots.some((s) => s.start.getTime() === at(11).getTime())).toBe(true);
    expect(slots.some((s) => s.start.getTime() === at(13).getTime())).toBe(true);
  });

  it("does not offer a slot too close to closing time to fit the service duration", () => {
    const slots = getAvailableSlots({
      date: WEDNESDAY,
      workingHours: staffWorksWednesdays9to5, // closes at 17:00
      timeOff: [],
      existingAppointments: [],
      serviceDurationMinutes: 90, // won't fit starting at 16:00 (would end 17:30)
      slotIntervalMinutes: 60,
    });

    const lastSlotStart = slots.at(-1)?.start;
    expect(lastSlotStart).toEqual(at(15));
    expect(slots.some((s) => s.start.getTime() === at(16).getTime())).toBe(false);
  });

  it("returns no slots when the entire day is blocked by time off", () => {
    const slots = getAvailableSlots({
      date: WEDNESDAY,
      workingHours: staffWorksWednesdays9to5,
      timeOff: [{ start: at(0), end: at(23, 59) }],
      existingAppointments: [],
      serviceDurationMinutes: 60,
    });

    expect(slots).toHaveLength(0);
  });

  it("returns no slots for a day the staff member doesn't work at all", () => {
    const slots = getAvailableSlots({
      date: WEDNESDAY,
      workingHours: [{ dayOfWeek: 1, startTime: "09:00", endTime: "17:00" }], // Monday only
      timeOff: [],
      existingAppointments: [],
      serviceDurationMinutes: 60,
    });

    expect(slots).toHaveLength(0);
  });
});
