import type {
  Appointment,
  AppointmentSource,
  AppointmentStatus,
  PrismaClient,
} from "@prisma/client";

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

  async findById(appointmentId: number): Promise<Appointment | null> {
    return this.db.appointment.findUnique({ where: { id: appointmentId } });
  }

  /** Every appointment for this staff member on a given day, any status - for the staff day view. */
  async findByStaffAndDateRange(
    staffId: number,
    rangeStart: Date,
    rangeEnd: Date,
  ): Promise<Appointment[]> {
    return this.db.appointment.findMany({
      where: {
        staffId,
        startTime: { lt: rangeEnd },
        endTime: { gt: rangeStart },
      },
      orderBy: { startTime: "asc" },
    });
  }

  /** Every appointment across all staff on a given day, any status - for a salon-wide day view. */
  async findByDateRange(rangeStart: Date, rangeEnd: Date): Promise<Appointment[]> {
    return this.db.appointment.findMany({
      where: {
        startTime: { lt: rangeEnd },
        endTime: { gt: rangeStart },
      },
      orderBy: [{ staffId: "asc" }, { startTime: "asc" }],
    });
  }

  /** Every appointment a customer has ever had, most recent first - their booking history. */
  async findByCustomerId(customerId: number): Promise<Appointment[]> {
    return this.db.appointment.findMany({
      where: { customerId },
      orderBy: { startTime: "desc" },
    });
  }

  async updateStatus(appointmentId: number, status: AppointmentStatus): Promise<Appointment> {
    return this.db.appointment.update({ where: { id: appointmentId }, data: { status } });
  }
}
