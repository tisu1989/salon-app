import { describe, expect, it } from "vitest";
import { furthestReachableIndex, type BookingDraft } from "./booking-draft";

const empty: BookingDraft = {
  customer: null,
  serviceId: null,
  staffId: null,
  date: "2026-09-21",
  slot: null,
};

const customer = { id: 1, name: "Asha", phone: "+911" };
const slot = { start: "2026-09-21T09:00:00.000Z", end: "2026-09-21T09:30:00.000Z" };

describe("furthestReachableIndex (which wizard steps are unlocked)", () => {
  it("only the Customer step is open at the start", () => {
    expect(furthestReachableIndex(empty)).toBe(0);
  });

  it("unlocks one more step for each choice made, in order", () => {
    const withCustomer = { ...empty, customer };
    const withService = { ...withCustomer, serviceId: 2 };
    const withStaff = { ...withService, staffId: 3 };
    const withSlot = { ...withStaff, slot };

    expect(furthestReachableIndex(withCustomer)).toBe(1);
    expect(furthestReachableIndex(withService)).toBe(2);
    expect(furthestReachableIndex(withStaff)).toBe(3);
    expect(furthestReachableIndex(withSlot)).toBe(4);
  });

  it("does not skip ahead: a slot without a customer still leaves you at step 0", () => {
    // This is the rule the stepper relies on to stop people jumping to "Confirm" early.
    expect(furthestReachableIndex({ ...empty, serviceId: 2, staffId: 3, slot })).toBe(0);
  });
});
