import { parseDateInputValue } from "../../lib/date";
import type { TimeOffBlock, WorkingHoursRule } from "./staff.types";

export type AvailabilityStatus =
  | { kind: "not-scheduled" }
  | { kind: "working"; startTime: string; endTime: string }
  | { kind: "on-leave"; reason: string | null; startDateTime: string; endDateTime: string };

/**
 * Combines a staff member's recurring weekly schedule with their one-off time-off blocks
 * to answer one question for one specific date: are they in today, and if so, on leave?
 * Pure - no React, no fetching - so it's trivial to unit test with fixed data.
 */
export function computeAvailability(
  dateKey: string,
  workingHours: WorkingHoursRule[],
  timeOff: TimeOffBlock[],
): AvailabilityStatus {
  const date = parseDateInputValue(dateKey);
  const dayOfWeek = date.getDay();
  const rule = workingHours.find((r) => r.dayOfWeek === dayOfWeek);

  // Doesn't work this day of week at all - a leave block on top of that wouldn't add
  // information, so this takes priority over checking for one.
  if (!rule) {
    return { kind: "not-scheduled" };
  }

  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);

  const leave = timeOff.find((block) => {
    const start = new Date(block.startDateTime);
    const end = new Date(block.endDateTime);
    return start < dayEnd && end > dayStart;
  });

  if (leave) {
    return {
      kind: "on-leave",
      reason: leave.reason,
      startDateTime: leave.startDateTime,
      endDateTime: leave.endDateTime,
    };
  }

  return { kind: "working", startTime: rule.startTime, endTime: rule.endTime };
}
