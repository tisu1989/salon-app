import request from "supertest";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../../app.js";
import { prisma } from "../../config/prisma.js";
import { redis } from "../../config/redis.js";
import { resetDatabase } from "../../test-support/reset-db.js";
import { createStaff, loginAs } from "../../test-support/factories.js";

const app = createApp();

beforeEach(async () => {
  await resetDatabase(prisma);
  await redis.flushdb();
});

afterAll(async () => {
  await prisma.$disconnect();
  redis.disconnect();
});

describe("RBAC on POST /api/v1/staff (admin-only)", () => {
  const newStaffPayload = {
    name: "New Hire",
    phone: "+900000000099",
    password: "SomePassword123!",
  };

  it("rejects a STAFF-role token with 403", async () => {
    await createStaff(prisma, { phone: "+900000000010", role: "STAFF" });
    const token = await loginAs(app, "+900000000010");

    const res = await request(app)
      .post("/api/v1/staff")
      .set("Authorization", `Bearer ${token}`)
      .send(newStaffPayload);

    expect(res.status).toBe(403);
    expect(res.body.code).toBe("FORBIDDEN");
  });

  it("rejects a request with no token at all with 401", async () => {
    const res = await request(app).post("/api/v1/staff").send(newStaffPayload);
    expect(res.status).toBe(401);
  });

  it("allows an ADMIN-role token", async () => {
    await createStaff(prisma, { phone: "+900000000011", role: "ADMIN" });
    const token = await loginAs(app, "+900000000011");

    const res = await request(app)
      .post("/api/v1/staff")
      .set("Authorization", `Bearer ${token}`)
      .send(newStaffPayload);

    expect(res.status).toBe(201);
    expect(res.body.staff.phone).toBe(newStaffPayload.phone);
  });
});
