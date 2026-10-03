import type { Appointment } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { canActOnAppointment } from "./ownership.js";

function makeAppointment(staffId: number): Appointment {
  return {
    id: 1,
    customerId: 1,
    staffId,
    serviceId: 1,
    startTime: new Date(),
    endTime: new Date(),
    status: "BOOKED",
    source: "STAFF",
    createdById: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Appointment;
}

describe("canActOnAppointment", () => {
  it("lets a STAFF member act on their own appointment", () => {
    expect(canActOnAppointment(makeAppointment(5), { id: 5, role: "STAFF" })).toBe(true);
  });

  it("blocks a STAFF member from acting on someone else's appointment", () => {
    expect(canActOnAppointment(makeAppointment(5), { id: 9, role: "STAFF" })).toBe(false);
  });

  it("lets an ADMIN act on any appointment, including their own", () => {
    expect(canActOnAppointment(makeAppointment(5), { id: 9, role: "ADMIN" })).toBe(true);
    expect(canActOnAppointment(makeAppointment(5), { id: 5, role: "ADMIN" })).toBe(true);
  });
});
