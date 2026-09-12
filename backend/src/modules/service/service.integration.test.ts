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

describe("POST /api/v1/services (admin-only)", () => {
  it("creates a service as admin", async () => {
    await createStaff(prisma, { phone: "+900000000050", role: "ADMIN" });
    const token = await loginAs(app, "+900000000050");

    const res = await request(app)
      .post("/api/v1/services")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Pedicure", durationMinutes: 40, price: 450 });

    expect(res.status).toBe(201);
    expect(res.body.service).toMatchObject({ name: "Pedicure", durationMinutes: 40 });
  });

  it("rejects a STAFF-role token with 403", async () => {
    await createStaff(prisma, { phone: "+900000000051", role: "STAFF" });
    const token = await loginAs(app, "+900000000051");

    const res = await request(app)
      .post("/api/v1/services")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Pedicure", durationMinutes: 40, price: 450 });

    expect(res.status).toBe(403);
  });
});

describe("PATCH /api/v1/services/:id and /:id/deactivate", () => {
  it("updates a service's price, and deactivating removes it from the active list", async () => {
    await createStaff(prisma, { phone: "+900000000052", role: "ADMIN" });
    const token = await loginAs(app, "+900000000052");
    const service = await prisma.service.create({
      data: { name: "Facial", durationMinutes: 60, price: 800 },
    });

    const updateRes = await request(app)
      .patch(`/api/v1/services/${service.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ price: 900 });
    expect(updateRes.status).toBe(200);
    expect(Number(updateRes.body.service.price)).toBe(900);

    const deactivateRes = await request(app)
      .patch(`/api/v1/services/${service.id}/deactivate`)
      .set("Authorization", `Bearer ${token}`);
    expect(deactivateRes.status).toBe(200);

    const listRes = await request(app)
      .get("/api/v1/services")
      .set("Authorization", `Bearer ${token}`);
    expect(listRes.body.services.map((s: { id: number }) => s.id)).not.toContain(service.id);
  });
});
