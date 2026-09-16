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

export interface ListAppointmentsParams {
  staffId: number;
  date: string;
}

export interface CreateAppointmentRequest {
  customerId: number;
  staffId: number;
  serviceId: number;
  startTime: string;
  endTime: string;
}

/**
 * Only the transitions the backend actually exposes as routes. The service layer's
 * ALLOWED_TRANSITIONS table also lists BOOKED -> CONFIRMED, but there is no
 * PATCH /appointments/:id/confirm route to reach it yet (Blueprint > Backend Gaps).
 */
export const REACHABLE_ACTIONS: Record<AppointmentStatus, Array<"cancel" | "complete" | "no-show">> = {
  BOOKED: ["cancel", "complete", "no-show"],
  CONFIRMED: ["cancel", "complete", "no-show"],
  CANCELLED: [],
  COMPLETED: [],
  NO_SHOW: [],
};
