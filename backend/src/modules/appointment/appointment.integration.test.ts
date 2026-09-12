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
