import request from "supertest";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../../app.js";
import { prisma } from "../../config/prisma.js";
import { redis } from "../../config/redis.js";
import { resetDatabase } from "../../test-support/reset-db.js";
import {
  createCustomer,
  createService,
  createStaff,
  createWorkingHoursAllWeek,
  loginAs,
} from "../../test-support/factories.js";

const app = createApp();

beforeEach(async () => {
  await resetDatabase(prisma);
  await redis.flushdb();
});

afterAll(async () => {
  await prisma.$disconnect();
  redis.disconnect();
});

/** A date guaranteed to be in the future relative to "now", so it's never accidentally in the past. */
function daysFromNow(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(0, 0, 0, 0);
  return d;
}

describe("appointment booking flow", () => {
  it("books a free slot, then rejects a second booking for the exact same slot", async () => {
    const staff = await createStaff(prisma, { phone: "+900000000020", role: "STAFF" });
    await createWorkingHoursAllWeek(prisma, staff.id);
    const service = await createService(prisma, { durationMinutes: 30 });
    const customer = await createCustomer(prisma, { phone: "+900000000030" });
    const token = await loginAs(app, "+900000000020");

    const date = daysFromNow(1).toISOString();

    const availabilityRes = await request(app)
      .get("/api/v1/appointments/availability")
      .query({ staffId: staff.id, serviceId: service.id, date })
      .set("Authorization", `Bearer ${token}`);

    expect(availabilityRes.status).toBe(200);
    expect(availabilityRes.body.slots.length).toBeGreaterThan(0);
    const slot = availabilityRes.body.slots[0];

    const bookRes = await request(app)
      .post("/api/v1/appointments")
      .set("Authorization", `Bearer ${token}`)
      .send({
        customerId: customer.id,
        staffId: staff.id,
        serviceId: service.id,
        startTime: slot.start,
        endTime: slot.end,
      });

    expect(bookRes.status).toBe(201);
    expect(bookRes.body.appointment).toMatchObject({
      status: "BOOKED",
      source: "STAFF",
      staffId: staff.id,
      serviceId: service.id,
      customerId: customer.id,
    });

    // Same exact slot again - must now be rejected, not double-booked.
    const secondBookRes = await request(app)
      .post("/api/v1/appointments")
      .set("Authorization", `Bearer ${token}`)
      .send({
        customerId: customer.id,
        staffId: staff.id,
        serviceId: service.id,
        startTime: slot.start,
        endTime: slot.end,
      });

    expect(secondBookRes.status).toBe(409);
    expect(secondBookRes.body.code).toBe("SLOT_UNAVAILABLE");
  });

  it("frees the slot back up after cancelling", async () => {
    const staff = await createStaff(prisma, { phone: "+900000000021", role: "STAFF" });
    await createWorkingHoursAllWeek(prisma, staff.id);
    const service = await createService(prisma, { durationMinutes: 30 });
    const customer = await createCustomer(prisma, { phone: "+900000000031" });
    const token = await loginAs(app, "+900000000021");
    const date = daysFromNow(1).toISOString();

    const { body: availability } = await request(app)
      .get("/api/v1/appointments/availability")
      .query({ staffId: staff.id, serviceId: service.id, date })
      .set("Authorization", `Bearer ${token}`);
    const slot = availability.slots[0];

    const booked = await request(app)
      .post("/api/v1/appointments")
      .set("Authorization", `Bearer ${token}`)
      .send({
        customerId: customer.id,
        staffId: staff.id,
        serviceId: service.id,
        startTime: slot.start,
        endTime: slot.end,
      });

    const cancelRes = await request(app)
      .patch(`/api/v1/appointments/${booked.body.appointment.id}/cancel`)
      .set("Authorization", `Bearer ${token}`);
    expect(cancelRes.status).toBe(200);
    expect(cancelRes.body.appointment.status).toBe("CANCELLED");

    const rebooked = await request(app)
      .post("/api/v1/appointments")
      .set("Authorization", `Bearer ${token}`)
      .send({
        customerId: customer.id,
        staffId: staff.id,
        serviceId: service.id,
        startTime: slot.start,
        endTime: slot.end,
      });
    expect(rebooked.status).toBe(201);
  });

  it("queues a CONFIRMATION notification for a staff-sourced booking", async () => {
    const staff = await createStaff(prisma, { phone: "+900000000022", role: "STAFF" });
    await createWorkingHoursAllWeek(prisma, staff.id);
    const service = await createService(prisma, { durationMinutes: 30 });
    const customer = await createCustomer(prisma, { phone: "+900000000032" });
    const token = await loginAs(app, "+900000000022");
    const date = daysFromNow(1).toISOString();

    const { body: availability } = await request(app)
      .get("/api/v1/appointments/availability")
      .query({ staffId: staff.id, serviceId: service.id, date })
      .set("Authorization", `Bearer ${token}`);
    const slot = availability.slots[0];

    const booked = await request(app)
      .post("/api/v1/appointments")
      .set("Authorization", `Bearer ${token}`)
      .send({
        customerId: customer.id,
        staffId: staff.id,
        serviceId: service.id,
        startTime: slot.start,
        endTime: slot.end,
      });

    const notifications = await prisma.notificationLog.findMany({
      where: { appointmentId: booked.body.appointment.id },
    });
    expect(notifications).toHaveLength(1);
    expect(notifications[0]).toMatchObject({ type: "CONFIRMATION" });
  });
});

/** Books a fresh appointment end-to-end and returns its id, for tests that only care what happens next. */
async function bookTestAppointment(
  phoneSuffix: string,
): Promise<{ appointmentId: number; token: string }> {
  const staff = await createStaff(prisma, { phone: `+90000000${phoneSuffix}0`, role: "STAFF" });
  await createWorkingHoursAllWeek(prisma, staff.id);
  const service = await createService(prisma, { durationMinutes: 30 });
  const customer = await createCustomer(prisma, { phone: `+90000000${phoneSuffix}1` });
  const token = await loginAs(app, `+90000000${phoneSuffix}0`);
  const date = daysFromNow(1).toISOString();

  const { body: availability } = await request(app)
    .get("/api/v1/appointments/availability")
    .query({ staffId: staff.id, serviceId: service.id, date })
    .set("Authorization", `Bearer ${token}`);
  const slot = availability.slots[0];

  const booked = await request(app)
    .post("/api/v1/appointments")
    .set("Authorization", `Bearer ${token}`)
    .send({
      customerId: customer.id,
      staffId: staff.id,
      serviceId: service.id,
      startTime: slot.start,
      endTime: slot.end,
    });

  return { appointmentId: booked.body.appointment.id as number, token };
}

describe("appointment status transitions", () => {
  it("confirms a booked appointment", async () => {
    const { appointmentId, token } = await bookTestAppointment("44");

    const res = await request(app)
      .patch(`/api/v1/appointments/${appointmentId}/confirm`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.appointment.status).toBe("CONFIRMED");
  });

  it("marks a booked appointment as completed", async () => {
    const { appointmentId, token } = await bookTestAppointment("40");

    const res = await request(app)
      .patch(`/api/v1/appointments/${appointmentId}/complete`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.appointment.status).toBe("COMPLETED");
  });

  it("marks a booked appointment as a no-show", async () => {
    const { appointmentId, token } = await bookTestAppointment("41");

    const res = await request(app)
      .patch(`/api/v1/appointments/${appointmentId}/no-show`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.appointment.status).toBe("NO_SHOW");
  });

  it("rejects completing an appointment that was already cancelled", async () => {
    const { appointmentId, token } = await bookTestAppointment("42");

    await request(app)
      .patch(`/api/v1/appointments/${appointmentId}/cancel`)
      .set("Authorization", `Bearer ${token}`);

    const res = await request(app)
      .patch(`/api/v1/appointments/${appointmentId}/complete`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(409);
    expect(res.body.code).toBe("INVALID_STATUS_TRANSITION");
  });

  it("rejects cancelling an appointment that was already completed", async () => {
    const { appointmentId, token } = await bookTestAppointment("43");

    await request(app)
      .patch(`/api/v1/appointments/${appointmentId}/complete`)
      .set("Authorization", `Bearer ${token}`);

    const res = await request(app)
      .patch(`/api/v1/appointments/${appointmentId}/cancel`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(409);
    expect(res.body.code).toBe("INVALID_STATUS_TRANSITION");
  });
});

describe("GET /api/v1/appointments", () => {
  it("rejects a query with neither customerId nor date", async () => {
    const staff = await createStaff(prisma, { phone: "+900000000050", role: "STAFF" });
    const token = await loginAs(app, "+900000000050");

    const res = await request(app)
      .get("/api/v1/appointments")
      .query({ staffId: staff.id })
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(400);
  });

  it("returns a customer's booking history across different staff, most recent first", async () => {
    const staffA = await createStaff(prisma, { phone: "+900000000051", role: "STAFF" });
    const staffB = await createStaff(prisma, { phone: "+900000000052", role: "STAFF" });
    await createWorkingHoursAllWeek(prisma, staffA.id);
    await createWorkingHoursAllWeek(prisma, staffB.id);
    const service = await createService(prisma, { durationMinutes: 30 });
    const customer = await createCustomer(prisma, { phone: "+900000000053" });
    const token = await loginAs(app, "+900000000051");

    const earlierDate = daysFromNow(1).toISOString();
    const laterDate = daysFromNow(2).toISOString();

    const slotA = (
      await request(app)
        .get("/api/v1/appointments/availability")
        .query({ staffId: staffA.id, serviceId: service.id, date: earlierDate })
        .set("Authorization", `Bearer ${token}`)
    ).body.slots[0];
    const bookingA = await request(app)
      .post("/api/v1/appointments")
      .set("Authorization", `Bearer ${token}`)
      .send({
        customerId: customer.id,
        staffId: staffA.id,
        serviceId: service.id,
        startTime: slotA.start,
        endTime: slotA.end,
      });

    const slotB = (
      await request(app)
        .get("/api/v1/appointments/availability")
        .query({ staffId: staffB.id, serviceId: service.id, date: laterDate })
        .set("Authorization", `Bearer ${token}`)
    ).body.slots[0];
    const bookingB = await request(app)
      .post("/api/v1/appointments")
      .set("Authorization", `Bearer ${token}`)
      .send({
        customerId: customer.id,
        staffId: staffB.id,
        serviceId: service.id,
        startTime: slotB.start,
        endTime: slotB.end,
      });

    const res = await request(app)
      .get("/api/v1/appointments")
      .query({ customerId: customer.id })
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.appointments.map((a: { id: number }) => a.id)).toEqual([
      bookingB.body.appointment.id,
      bookingA.body.appointment.id,
    ]);
  });

  it("returns every staff member's appointments for a day when staffId is omitted", async () => {
    const staffA = await createStaff(prisma, { phone: "+900000000060", role: "STAFF" });
    const staffB = await createStaff(prisma, { phone: "+900000000061", role: "STAFF" });
    await createWorkingHoursAllWeek(prisma, staffA.id);
    await createWorkingHoursAllWeek(prisma, staffB.id);
    const service = await createService(prisma, { durationMinutes: 30 });
    const customer = await createCustomer(prisma, { phone: "+900000000062" });
    const token = await loginAs(app, "+900000000060");
    const date = daysFromNow(1).toISOString();

    const slotA = (
      await request(app)
        .get("/api/v1/appointments/availability")
        .query({ staffId: staffA.id, serviceId: service.id, date })
        .set("Authorization", `Bearer ${token}`)
    ).body.slots[0];
    await request(app).post("/api/v1/appointments").set("Authorization", `Bearer ${token}`).send({
      customerId: customer.id,
      staffId: staffA.id,
      serviceId: service.id,
      startTime: slotA.start,
      endTime: slotA.end,
    });

    const slotB = (
      await request(app)
        .get("/api/v1/appointments/availability")
        .query({ staffId: staffB.id, serviceId: service.id, date })
        .set("Authorization", `Bearer ${token}`)
    ).body.slots[0];
    await request(app).post("/api/v1/appointments").set("Authorization", `Bearer ${token}`).send({
      customerId: customer.id,
      staffId: staffB.id,
      serviceId: service.id,
      startTime: slotB.start,
      endTime: slotB.end,
    });

    const res = await request(app)
      .get("/api/v1/appointments")
      .query({ date })
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.appointments).toHaveLength(2);
    const staffIds = res.body.appointments.map((a: { staffId: number }) => a.staffId).sort();
    expect(staffIds).toEqual([staffA.id, staffB.id].sort());
  });
});
