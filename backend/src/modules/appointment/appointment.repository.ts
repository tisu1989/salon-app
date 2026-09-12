import type { Appointment, AppointmentSource, PrismaClient } from "@prisma/client";

export interface CreateAppointmentInput {
  customerId: number;
  staffId: number;
  serviceId: number;
  startTime: Date;
  endTime: Date;
  source: AppointmentSource;
  /** staff.id if booked manually by staff; omit for WhatsApp bookings. */
  createdById?: number;
}

export class AppointmentRepository {
  constructor(private readonly db: PrismaClient) {}

  /**
   * Appointments for this staff member that overlap [rangeStart, rangeEnd) and
   * are still "live" (excludes cancelled/no-show, since those free up the slot).
   */
  async findActiveByStaffAndDateRange(
    staffId: number,
    rangeStart: Date,
    rangeEnd: Date,
  ): Promise<Appointment[]> {
    return this.db.appointment.findMany({
      where: {
        staffId,
        startTime: { lt: rangeEnd },
        endTime: { gt: rangeStart },
        status: { notIn: ["CANCELLED", "NO_SHOW"] },
      },
    });
  }

  async create(input: CreateAppointmentInput): Promise<Appointment> {
    return this.db.appointment.create({ data: input });
  }
}
