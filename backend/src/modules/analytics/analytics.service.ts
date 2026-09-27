import type { AppointmentRepository } from "../appointment/appointment.repository.js";
import { summarizeAppointments, type AnalyticsSummary } from "./analytics.js";

const DEFAULT_DAYS = 7;

export class AnalyticsService {
  constructor(private readonly appointmentRepo: AppointmentRepository) {}

  /** The dashboard's numbers for the trailing N days, ending today (inclusive). */
  async getSummary(days = DEFAULT_DAYS): Promise<AnalyticsSummary> {
    const rangeEnd = new Date();
    rangeEnd.setHours(23, 59, 59, 999);

    const rangeStart = new Date(rangeEnd);
    rangeStart.setDate(rangeStart.getDate() - (days - 1));
    rangeStart.setHours(0, 0, 0, 0);

    // Every staff member, every status - findByDateRange already does exactly that (it's
    // the same query the salon-wide Today's Board uses, just over a wider window here).
    const appointments = await this.appointmentRepo.findByDateRange(rangeStart, rangeEnd);
    return summarizeAppointments(appointments, rangeStart, days);
  }
}
