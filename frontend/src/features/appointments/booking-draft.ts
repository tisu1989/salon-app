import type { Customer } from "../customers/customer.types";
import type { AvailabilitySlot } from "./appointment.types";

export interface BookingDraft {
  customer: Customer | null;
  serviceId: number | null;
  staffId: number | null;
  date: string;
  slot: AvailabilitySlot | null;
}

export const WIZARD_STEPS = ["customer", "service", "staff", "time", "confirm"] as const;
export type WizardStep = (typeof WIZARD_STEPS)[number];

export const STEP_LABELS: Record<WizardStep, string> = {
  customer: "Customer",
  service: "Service",
  staff: "Staff",
  time: "Time",
  confirm: "Confirm",
};

/** Which step is reachable given what's already chosen - lets the stepper allow jumping back but never ahead. */
export function furthestReachableIndex(draft: BookingDraft): number {
  if (!draft.customer) return 0;
  if (!draft.serviceId) return 1;
  if (!draft.staffId) return 2;
  if (!draft.slot) return 3;
  return 4;
}
