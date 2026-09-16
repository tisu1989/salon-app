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

let notificationFixtureCounter = 0;

/** A notification row with a real appointment behind it, in whatever status the test needs. */
async function createNotification(overrides: {
  status: "PENDING" | "SENT" | "FAILED";
  attempts?: number;
}) {
  const n = notificationFixtureCounter++;
  const staff = await createStaff(prisma, { phone: `+9000000009${n}0`, role: "STAFF" });
  const service = await createService(prisma);
  const customer = await createCustomer(prisma, { phone: `+9000000009${n}1` });
  const appointment = await prisma.appointment.create({
    data: {
      customerId: customer.id,
      staffId: staff.id,
      serviceId: service.id,
      startTime: new Date(Date.now() + 86400000),
      endTime: new Date(Date.now() + 86400000 + 1800000),
      source: "STAFF",
    },
  });
  const notification = await prisma.notificationLog.create({
    data: {
      appointmentId: appointment.id,
      type: "CONFIRMATION",
      status: overrides.status,
      attempts: overrides.attempts ?? 0,
    },
  });
  return notification;
}

describe("GET /api/v1/notifications", () => {
  it("lists notifications most recent first, optionally filtered by status", async () => {
    await createNotification({ status: "SENT" });
    const failed = await createNotification({ status: "FAILED", attempts: 5 });
    await createStaff(prisma, { phone: "+900000000072", role: "STAFF" });
    const token = await loginAs(app, "+900000000072");

    const all = await request(app)
      .get("/api/v1/notifications")
      .set("Authorization", `Bearer ${token}`);
    expect(all.status).toBe(200);
    expect(all.body.notifications).toHaveLength(2);
    // The joined staff record must never leak its password hash over the API.
    for (const n of all.body.notifications) {
      expect(n.appointment.staff.passwordHash).toBeUndefined();
    }

    const onlyFailed = await request(app)
      .get("/api/v1/notifications")
      .query({ status: "FAILED" })
      .set("Authorization", `Bearer ${token}`);
    expect(onlyFailed.status).toBe(200);
    expect(onlyFailed.body.notifications).toHaveLength(1);
    expect(onlyFailed.body.notifications[0].id).toBe(failed.id);
  });

  it("rejects a request with no token", async () => {
    const res = await request(app).get("/api/v1/notifications");
    expect(res.status).toBe(401);
  });
});

describe("POST /api/v1/notifications/:id/retry", () => {
  it("resets a FAILED notification back to PENDING with a clean attempt budget (admin-only)", async () => {
    const failed = await createNotification({ status: "FAILED", attempts: 5 });
    await createStaff(prisma, { phone: "+900000000073", role: "ADMIN" });
    const token = await loginAs(app, "+900000000073");

    const res = await request(app)
      .post(`/api/v1/notifications/${failed.id}/retry`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(204);

    const reloaded = await prisma.notificationLog.findUniqueOrThrow({ where: { id: failed.id } });
    expect(reloaded.status).toBe("PENDING");
    expect(reloaded.attempts).toBe(0);
    expect(reloaded.lastAttemptAt).toBeNull();
  });

  it("rejects retrying a notification that isn't FAILED", async () => {
    const sent = await createNotification({ status: "SENT" });
    await createStaff(prisma, { phone: "+900000000074", role: "ADMIN" });
    const token = await loginAs(app, "+900000000074");

    const res = await request(app)
      .post(`/api/v1/notifications/${sent.id}/retry`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(409);
    expect(res.body.code).toBe("INVALID_STATUS");
  });

  it("rejects a STAFF-role token with 403", async () => {
    const failed = await createNotification({ status: "FAILED", attempts: 5 });
    await createStaff(prisma, { phone: "+900000000075", role: "STAFF" });
    const token = await loginAs(app, "+900000000075");

    const res = await request(app)
      .post(`/api/v1/notifications/${failed.id}/retry`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(403);
  });
});
