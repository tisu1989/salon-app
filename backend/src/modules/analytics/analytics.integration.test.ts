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

/**
 * Analytics aggregates history, including past appointments - which the real booking flow
 * (POST /appointments) refuses to create, since it only offers future availability. So this
 * writes rows straight to the database, the same way notification.integration.test.ts fabricates
 * fixtures it needs a specific status/date for, rather than going through the booking API.
 */
async function createHistoricalAppointment(overrides: {
  staffId: number;
  customerId: number;
  serviceId: number;
  daysAgo: number;
  hour: number;
  status: "BOOKED" | "CONFIRMED" | "CANCELLED" | "COMPLETED" | "NO_SHOW";
}) {
  const startTime = new Date();
  startTime.setDate(startTime.getDate() - overrides.daysAgo);
  startTime.setHours(overrides.hour, 0, 0, 0);
  const endTime = new Date(startTime.getTime() + 30 * 60 * 1000);

  return prisma.appointment.create({
    data: {
      staffId: overrides.staffId,
      customerId: overrides.customerId,
      serviceId: overrides.serviceId,
      startTime,
      endTime,
      status: overrides.status,
      source: "STAFF",
    },
  });
}

describe("GET /api/v1/analytics/summary", () => {
  it("rejects a STAFF-role token with 403", async () => {
    await createStaff(prisma, { phone: "+900000000200", role: "STAFF" });
    const token = await loginAs(app, "+900000000200");

    const res = await request(app)
      .get("/api/v1/analytics/summary")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(403);
  });

  it("rejects a request with no token", async () => {
    const res = await request(app).get("/api/v1/analytics/summary");
    expect(res.status).toBe(401);
  });

  it("aggregates real appointments across the trailing window into the dashboard's numbers", async () => {
    const staff = await createStaff(prisma, { phone: "+900000000201", role: "ADMIN" });
    const service = await createService(prisma);
    const customer = await createCustomer(prisma, { phone: "+900000000202" });
    const token = await loginAs(app, "+900000000201");

    // Two completed today at 9am, one no-show today, one cancelled yesterday, one still
    // upcoming (BOOKED) 2 days ago's hour doesn't matter for status math.
    await createHistoricalAppointment({
      staffId: staff.id,
      customerId: customer.id,
      serviceId: service.id,
      daysAgo: 0,
      hour: 9,
      status: "COMPLETED",
    });
    await createHistoricalAppointment({
      staffId: staff.id,
      customerId: customer.id,
      serviceId: service.id,
      daysAgo: 0,
      hour: 9,
      status: "COMPLETED",
    });
    await createHistoricalAppointment({
      staffId: staff.id,
      customerId: customer.id,
      serviceId: service.id,
      daysAgo: 0,
      hour: 14,
      status: "NO_SHOW",
    });
    await createHistoricalAppointment({
      staffId: staff.id,
      customerId: customer.id,
      serviceId: service.id,
      daysAgo: 1,
      hour: 11,
      status: "CANCELLED",
    });

    const res = await request(app)
      .get("/api/v1/analytics/summary")
      .query({ days: 3 })
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.range.days).toBe(3);
    expect(res.body.bookingsByDay).toHaveLength(3);

    const today = res.body.bookingsByDay[2]; // range is oldest -> newest, today is last
    const yesterday = res.body.bookingsByDay[1];
    expect(today.count).toBe(3);
    expect(yesterday.count).toBe(1);

    expect(res.body.statusBreakdown).toMatchObject({ COMPLETED: 2, NO_SHOW: 1, CANCELLED: 1 });
    // 1 no-show out of 3 resolved (2 completed + 1 no-show) - cancelled doesn't count.
    expect(res.body.noShowRate).toBeCloseTo(1 / 3);

    expect(res.body.busiestHours).toHaveLength(24);
    expect(res.body.busiestHours[9]).toEqual({ hour: 9, count: 2 });
    expect(res.body.busiestHours[14]).toEqual({ hour: 14, count: 1 });
  });

  it("defaults to 7 days when no ?days is given, and rejects an out-of-range value", async () => {
    await createStaff(prisma, { phone: "+900000000203", role: "ADMIN" });
    const token = await loginAs(app, "+900000000203");

    const defaultRes = await request(app)
      .get("/api/v1/analytics/summary")
      .set("Authorization", `Bearer ${token}`);
    expect(defaultRes.status).toBe(200);
    expect(defaultRes.body.range.days).toBe(7);

    const tooMany = await request(app)
      .get("/api/v1/analytics/summary")
      .query({ days: 9999 })
      .set("Authorization", `Bearer ${token}`);
    expect(tooMany.status).toBe(400);
  });
});
