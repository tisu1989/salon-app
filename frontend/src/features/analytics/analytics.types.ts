export interface DailyCount {
  date: string;
  count: number;
}

export interface HourlyCount {
  hour: number;
  count: number;
}

export type AppointmentStatus = "BOOKED" | "CONFIRMED" | "CANCELLED" | "COMPLETED" | "NO_SHOW";

export interface AnalyticsSummary {
  range: { days: number; from: string; to: string };
  bookingsByDay: DailyCount[];
  statusBreakdown: Record<AppointmentStatus, number>;
  noShowRate: number;
  busiestHours: HourlyCount[];
}
