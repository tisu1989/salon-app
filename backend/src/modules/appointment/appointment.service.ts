import type { Appointment, AppointmentStatus } from "@prisma/client";
import { AppError } from "../../middleware/error-handler.js";
import type { ServiceRepository } from "../service/service.repository.js";
import type { StaffRepository } from "../staff/staff.repository.js";
import type { NotificationRepository } from "../notification/notification.repository.js";
import { getAvailableSlots, type TimeRange } from "./availability.js";
import type { AppointmentRepository, CreateAppointmentInput } from "./appointment.repository.js";

/**
 * Which statuses an appointment can move to from each current status. Kept as
 * data rather than scattered if-checks so adding a future status (or loosening
 * a rule) is a one-line table edit, not a hunt through every method that
 * touches status. Terminal statuses (empty array) can't be left at all.
 */
const ALLOWED_TRANSITIONS: Record<AppointmentStatus, AppointmentStatus[]> = {
  BOOKED: ["CONFIRMED", "CANCELLED", "COMPLETED", "NO_SHOW"],
  CONFIRMED: ["CANCELLED", "COMPLETED", "NO_SHOW"],
  CANCELLED: [],
  COMPLETED: [],
  NO_SHOW: [],
};

export class AppointmentService {
  constructor(
    private readonly appointmentRepo: AppointmentRepository,
    private readonly staffRepo: StaffRepository,
    private readonly serviceRepo: ServiceRepository,
    private readonly notificationRepo: NotificationRepository,
  ) {}

  /**
   * Computes free slots for a given staff member + service on a given date.
   * This is the function both the manual-booking UI and the WhatsApp bot call -
   * one source of truth for availability everywhere in the app.
   */
  async getAvailability(staffId: number, serviceId: number, date: Date): Promise<TimeRange[]> {
    const service = await this.serviceRepo.findById(serviceId);
    if (!service) {
      throw new AppError("SERVICE_NOT_FOUND", `Service ${serviceId} does not exist`, 404);
    }

    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    const [workingHours, timeOff, appointments] = await Promise.all([
      this.staffRepo.getWorkingHours(staffId),
      this.staffRepo.getTimeOffInRange(staffId, dayStart, dayEnd),
      this.appointmentRepo.findActiveByStaffAndDateRange(staffId, dayStart, dayEnd),
    ]);

    return getAvailableSlots({
      date,
      workingHours,
      timeOff: timeOff.map((t) => ({ start: t.startDateTime, end: t.endDateTime })),
      existingAppointments: appointments.map((a) => ({ start: a.startTime, end: a.endTime })),
      serviceDurationMinutes: service.durationMinutes,
    });
  }

  /**
   * Books an appointment - re-validates availability first so two customers
   * can't book the same slot in a race (e.g. one via WhatsApp, one via staff panel).
   */
  async book(input: CreateAppointmentInput): Promise<Appointment> {
    const freeSlots = await this.getAvailability(input.staffId, input.serviceId, input.startTime);

    const isStillFree = freeSlots.some(
      (slot) =>
        slot.start.getTime() === input.startTime.getTime() &&
        slot.end.getTime() === input.endTime.getTime(),
    );

    if (!isStillFree) {
      throw new AppError(
        "SLOT_UNAVAILABLE",
        "This time slot is no longer available - please pick another.",
        409,
      );
    }

    const appointment = await this.appointmentRepo.create(input);

    // WhatsApp bookings already get an in-conversation confirmation from the bot
    // itself - queuing another one here would send the customer a duplicate message.
    if (input.source === "STAFF") {
      await this.notificationRepo.create({ appointmentId: appointment.id, type: "CONFIRMATION" });
    }

    return appointment;
  }

  /**
   * Every appointment for one day, any status - the day-view screen. With a staffId,
   * just that person's calendar; without one, every staff member's day at once (the
   * salon-wide front-desk board).
   */
  async listForDay(date: Date, staffId?: number): Promise<Appointment[]> {
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    return staffId !== undefined
      ? this.appointmentRepo.findByStaffAndDateRange(staffId, dayStart, dayEnd)
      : this.appointmentRepo.findByDateRange(dayStart, dayEnd);
  }

  /** A customer's full booking history, most recent first. */
  async listForCustomer(customerId: number): Promise<Appointment[]> {
    return this.appointmentRepo.findByCustomerId(customerId);
  }

  /** Confirms a booked appointment - the customer has verified they're coming. */
  async confirm(appointmentId: number): Promise<Appointment> {
    return this.transitionStatus(appointmentId, "CONFIRMED");
  }

  /** Cancels a booked appointment, freeing its slot back up. */
  async cancel(appointmentId: number): Promise<Appointment> {
    return this.transitionStatus(appointmentId, "CANCELLED");
  }

  /** Marks an appointment as completed - the service was actually delivered. */
  async markCompleted(appointmentId: number): Promise<Appointment> {
    return this.transitionStatus(appointmentId, "COMPLETED");
  }

  /** Marks an appointment as a no-show - the customer never turned up. */
  async markNoShow(appointmentId: number): Promise<Appointment> {
    return this.transitionStatus(appointmentId, "NO_SHOW");
  }

  private async transitionStatus(
    appointmentId: number,
    to: AppointmentStatus,
  ): Promise<Appointment> {
    const appointment = await this.appointmentRepo.findById(appointmentId);
    if (!appointment) {
      throw new AppError(
        "APPOINTMENT_NOT_FOUND",
        `Appointment ${appointmentId} does not exist`,
        404,
      );
    }

    // Already there - treat as a no-op success rather than an error (e.g.
    // cancelling something twice shouldn't fail just because it's idempotent).
    if (appointment.status === to) {
      return appointment;
    }

    if (!ALLOWED_TRANSITIONS[appointment.status].includes(to)) {
      throw new AppError(
        "INVALID_STATUS_TRANSITION",
        `Cannot change status from ${appointment.status} to ${to}.`,
        409,
      );
    }

    return this.appointmentRepo.updateStatus(appointmentId, to);
  }
}
