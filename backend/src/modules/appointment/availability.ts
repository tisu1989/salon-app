/**
 * Availability engine - pure, dependency-free logic for computing free slots.
 *
 * Deliberately has zero knowledge of Prisma, Express, or Redis - it takes plain
 * data in and returns plain data out. This is what makes it trivial to unit test
 * and safe to cache (the caching layer wraps this function, it doesn't change it).
 */

export interface WorkingHoursRule {
  dayOfWeek: number; // 0 = Sunday ... 6 = Saturday
  startTime: string; // "09:00"
  endTime: string; // "18:00"
}

export interface TimeRange {
  start: Date;
  end: Date;
}

export interface GetAvailableSlotsInput {
  /** The calendar date to compute slots for. Only the year/month/day are used. */
  date: Date;
  /** All recurring working-hour rules for this staff member (any day of week). */
  workingHours: WorkingHoursRule[];
  /** Time-off blocks for this staff member (only ones overlapping `date` matter). */
  timeOff: TimeRange[];
  /** Existing appointments for this staff member (only ones overlapping `date` matter). */
  existingAppointments: TimeRange[];
  /** How long the requested service takes. */
  serviceDurationMinutes: number;
  /** Granularity to step through the day when looking for a free start time. Default 15. */
  slotIntervalMinutes?: number;
}

const DEFAULT_SLOT_INTERVAL_MINUTES = 15;

/**
 * Returns every slot on `date` where a service of `serviceDurationMinutes` could
 * start without overlapping time-off or an existing appointment, and without
 * running past the end of the staff member's working hours for that day.
 */
export function getAvailableSlots(input: GetAvailableSlotsInput): TimeRange[] {
  const {
    date,
    workingHours,
    timeOff,
    existingAppointments,
    serviceDurationMinutes,
    slotIntervalMinutes = DEFAULT_SLOT_INTERVAL_MINUTES,
  } = input;

  const dayOfWeek = date.getDay();
  const rule = workingHours.find((wh) => wh.dayOfWeek === dayOfWeek);

  // No working-hours rule for this day of week -> staff doesn't work that day at all.
  if (!rule) {
    return [];
  }

  const dayStart = combineDateAndTime(date, rule.startTime);
  const dayEnd = combineDateAndTime(date, rule.endTime);

  if (dayEnd <= dayStart) {
    return [];
  }

  // Only the busy intervals that actually fall on this date matter.
  const busy = [...timeOff, ...existingAppointments]
    .filter((range) => overlaps(range.start, range.end, dayStart, dayEnd))
    .sort((a, b) => a.start.getTime() - b.start.getTime());

  const slots: TimeRange[] = [];
  const stepMs = slotIntervalMinutes * 60_000;
  const durationMs = serviceDurationMinutes * 60_000;

  for (
    let candidateStart = dayStart.getTime();
    candidateStart + durationMs <= dayEnd.getTime();
    candidateStart += stepMs
  ) {
    const candidateEnd = candidateStart + durationMs;

    const isBlocked = busy.some((range) =>
      overlaps(new Date(candidateStart), new Date(candidateEnd), range.start, range.end),
    );

    if (!isBlocked) {
      slots.push({ start: new Date(candidateStart), end: new Date(candidateEnd) });
    }
  }

  return slots;
}

/** True if [aStart, aEnd) and [bStart, bEnd) overlap at all. */
function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart < bEnd && bStart < aEnd;
}

/** Combines a date's year/month/day with a "HH:mm" time string into one Date. */
function combineDateAndTime(date: Date, time: string): Date {
  const [hours, minutes] = time.split(":").map(Number);
  const result = new Date(date);
  result.setHours(hours ?? 0, minutes ?? 0, 0, 0);
  return result;
}
