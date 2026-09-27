/**
 * Dashboard aggregation - pure, dependency-free logic for turning a flat list of
 * appointments into the numbers the dashboard shows. Same idea as
 * appointment/availability.ts: no Prisma, no Express, no "now" computed internally -
 * the caller decides the window, this just does the counting. Trivial to unit test
 * with a fixed appointment list and a fixed range.
 */
import type { AppointmentStatus } from "@prisma/client";

export interface DailyCount {
  /** YYYY-MM-DD, in the server's local calendar day. */
  date: string;
  count: number;
}

export interface HourlyCount {
  /** 0-23, local hour of day. */
  hour: number;
  count: number;
}

export interface AnalyticsSummary {
  range: { days: number; from: string; to: string };
  /** One entry per day in the range, in order - including days with zero bookings. */
  bookingsByDay: DailyCount[];
  statusBreakdown: Record<AppointmentStatus, number>;
  /** NO_SHOW / (COMPLETED + NO_SHOW) - 0 when neither has happened yet, not a divide-by-zero. */
  noShowRate: number;
  /** All 24 hours, in order - including hours with zero bookings, for a full-day chart. */
  busiestHours: HourlyCount[];
}

function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function summarizeAppointments(
  appointments: Array<{ startTime: Date; status: AppointmentStatus }>,
  rangeStart: Date,
  days: number,
): AnalyticsSummary {
  // Seed every day with 0 first, so a quiet day shows as a zero bar rather than a gap
  // the frontend has to notice and fill in itself.
  const bookingsByDay = new Map<string, number>();
  for (let i = 0; i < days; i++) {
    const day = new Date(rangeStart);
    day.setDate(day.getDate() + i);
    bookingsByDay.set(toDateKey(day), 0);
  }

  const hourCounts = new Array<number>(24).fill(0);
  const statusBreakdown: Record<AppointmentStatus, number> = {
    BOOKED: 0,
    CONFIRMED: 0,
    CANCELLED: 0,
    COMPLETED: 0,
    NO_SHOW: 0,
  };

  for (const appointment of appointments) {
    const dateKey = toDateKey(appointment.startTime);
    // An appointment can start just outside the requested range if the caller's window
    // math ever drifts - skip rather than silently creating an extra day bucket.
    if (bookingsByDay.has(dateKey)) {
      bookingsByDay.set(dateKey, bookingsByDay.get(dateKey)! + 1);
    }
    hourCounts[appointment.startTime.getHours()]! += 1;
    statusBreakdown[appointment.status] += 1;
  }

  const resolved = statusBreakdown.COMPLETED + statusBreakdown.NO_SHOW;
  const noShowRate = resolved === 0 ? 0 : statusBreakdown.NO_SHOW / resolved;

  const lastDay = new Date(rangeStart);
  lastDay.setDate(lastDay.getDate() + days - 1);

  return {
    range: { days, from: toDateKey(rangeStart), to: toDateKey(lastDay) },
    bookingsByDay: [...bookingsByDay.entries()].map(([date, count]) => ({ date, count })),
    statusBreakdown,
    noShowRate,
    busiestHours: hourCounts.map((count, hour) => ({ hour, count })),
  };
}
