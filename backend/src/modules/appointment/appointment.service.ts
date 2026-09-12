import type { Appointment } from "@prisma/client";
import { AppError } from "../../middleware/error-handler.js";
import type { ServiceRepository } from "../service/service.repository.js";
import type { StaffRepository } from "../staff/staff.repository.js";
import { getAvailableSlots, type TimeRange } from "./availability.js";
import type { AppointmentRepository, CreateAppointmentInput } from "./appointment.repository.js";

export class AppointmentService {
  constructor(
    private readonly appointmentRepo: AppointmentRepository,
    private readonly staffRepo: StaffRepository,
    private readonly serviceRepo: ServiceRepository,
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

    return this.appointmentRepo.create(input);
  }

  /** Every appointment on a staff member's calendar for one day, any status - for a day-view screen. */
  async listForStaffAndDate(staffId: number, date: Date): Promise<Appointment[]> {
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    return this.appointmentRepo.findByStaffAndDateRange(staffId, dayStart, dayEnd);
  }

  /** Cancels a booked appointment, freeing its slot back up. */
  async cancel(appointmentId: number): Promise<Appointment> {
    const appointment = await this.appointmentRepo.findById(appointmentId);
    if (!appointment) {
      throw new AppError(
        "APPOINTMENT_NOT_FOUND",
        `Appointment ${appointmentId} does not exist`,
        404,
      );
    }

    if (appointment.status === "CANCELLED") {
      return appointment;
    }
    if (appointment.status === "COMPLETED" || appointment.status === "NO_SHOW") {
      throw new AppError(
        "APPOINTMENT_NOT_CANCELLABLE",
        `Cannot cancel an appointment that is already ${appointment.status}.`,
        409,
      );
    }

    return this.appointmentRepo.updateStatus(appointmentId, "CANCELLED");
  }
}
