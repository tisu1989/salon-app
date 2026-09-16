import type { Role } from "../auth/auth.types";

export interface StaffMember {
  id: number;
  name: string;
  phone: string;
  email: string | null;
  role: Role;
  isActive: boolean;
}

export interface WorkingHoursRule {
  id: number;
  staffId: number;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

export interface TimeOffBlock {
  id: number;
  staffId: number;
  startDateTime: string;
  endDateTime: string;
  reason: string | null;
}
