export type AppointmentStatus = "BOOKED" | "CONFIRMED" | "CANCELLED" | "COMPLETED" | "NO_SHOW";

export interface Appointment {
  id: number;
  customerId: number;
  staffId: number;
  serviceId: number;
  startTime: string;
  endTime: string;
  status: AppointmentStatus;
  source: "STAFF" | "WHATSAPP";
  createdById: number | null;
}

/**
 * Mirrors the backend's actual query contract: either a day (optionally narrowed to one
 * staff member - omitting staffId gets every staff member's day, the salon-wide board),
 * or a customer's full history. Never both at once.
 */
export type ListAppointmentsParams = { date: string; staffId?: number } | { customerId: number };

export interface CreateAppointmentRequest {
  customerId: number;
  staffId: number;
  serviceId: number;
  startTime: string;
  endTime: string;
}

export interface AvailabilitySlot {
  start: string;
  end: string;
}

export interface AvailabilityParams {
  staffId: number;
  serviceId: number;
  date: string;
}

/** Which action buttons a screen can offer for each status - matches the routes the backend actually exposes. */
export const REACHABLE_ACTIONS: Record<
  AppointmentStatus,
  Array<"confirm" | "cancel" | "complete" | "no-show">
> = {
  BOOKED: ["confirm", "cancel", "complete", "no-show"],
  CONFIRMED: ["cancel", "complete", "no-show"],
  CANCELLED: [],
  COMPLETED: [],
  NO_SHOW: [],
};
