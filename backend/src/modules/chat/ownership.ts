import type { Appointment } from "@prisma/client";

export interface ChatUser {
  id: number;
  role: "STAFF" | "ADMIN";
}

/**
 * The second, independent safety check from the design: even though STAFF is only ever
 * offered tools that already imply "my own appointments", this re-checks right before the
 * real write happens - the same defense-in-depth the rest of the app already uses (every
 * admin-only button is protected by both a route-level check and this kind of guard).
 */
export function canActOnAppointment(appointment: Appointment, caller: ChatUser): boolean {
  return caller.role === "ADMIN" || appointment.staffId === caller.id;
}
