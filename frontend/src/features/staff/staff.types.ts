import type { Role } from "../auth/auth.types";

export interface StaffMember {
  id: number;
  name: string;
  phone: string;
  email: string | null;
  role: Role;
  isActive: boolean;
}
