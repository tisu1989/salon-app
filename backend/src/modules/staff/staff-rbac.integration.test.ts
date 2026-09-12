import request from "supertest";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../../app.js";
import { prisma } from "../../config/prisma.js";
import { redis } from "../../config/redis.js";
import { resetDatabase } from "../../test-support/reset-db.js";
import { TEST_PASSWORD, createStaff, loginAs } from "../../test-support/factories.js";

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

describe("PATCH /api/v1/staff/:id", () => {
  it("updates name/email as admin, and never returns passwordHash", async () => {
    await createStaff(prisma, { phone: "+900000000012", role: "ADMIN" });
    const token = await loginAs(app, "+900000000012");
    const target = await createStaff(prisma, {
      phone: "+900000000013",
      role: "STAFF",
      name: "Old Name",
    });

    const res = await request(app)
      .patch(`/api/v1/staff/${target.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "New Name" });

    expect(res.status).toBe(200);
    expect(res.body.staff.name).toBe("New Name");
    expect(res.body.staff.passwordHash).toBeUndefined();
  });

  it("rejects a STAFF-role token with 403", async () => {
    await createStaff(prisma, { phone: "+900000000014", role: "STAFF" });
    const token = await loginAs(app, "+900000000014");
    const target = await createStaff(prisma, { phone: "+900000000015", role: "STAFF" });

    const res = await request(app)
      .patch(`/api/v1/staff/${target.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Whatever" });

    expect(res.status).toBe(403);
  });

  it("404s for a staff id that doesn't exist", async () => {
    await createStaff(prisma, { phone: "+900000000016", role: "ADMIN" });
    const token = await loginAs(app, "+900000000016");

    const res = await request(app)
      .patch("/api/v1/staff/999999")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Whoever" });

    expect(res.status).toBe(404);
  });
});

describe("PATCH /api/v1/staff/:id/deactivate", () => {
  it("removes the staff member from the active list", async () => {
    await createStaff(prisma, { phone: "+900000000017", role: "ADMIN" });
    const token = await loginAs(app, "+900000000017");
    const target = await createStaff(prisma, { phone: "+900000000018", role: "STAFF" });

    const deactivateRes = await request(app)
      .patch(`/api/v1/staff/${target.id}/deactivate`)
      .set("Authorization", `Bearer ${token}`);
    expect(deactivateRes.status).toBe(200);
    expect(deactivateRes.body.staff.isActive).toBe(false);

    const listRes = await request(app).get("/api/v1/staff").set("Authorization", `Bearer ${token}`);
    expect(listRes.body.staff.map((s: { id: number }) => s.id)).not.toContain(target.id);
  });
});

describe("PATCH /api/v1/staff/:id/reset-password", () => {
  it("changes the password and revokes existing sessions", async () => {
    await createStaff(prisma, { phone: "+900000000019", role: "ADMIN" });
    const adminToken = await loginAs(app, "+900000000019");
    const target = await createStaff(prisma, { phone: "+900000000020", role: "STAFF" });

    const targetLogin = await request(app)
      .post("/api/v1/auth/login")
      .send({ identifier: "+900000000020", password: TEST_PASSWORD });
    const oldRefreshToken = targetLogin.body.refreshToken as string;

    const resetRes = await request(app)
      .patch(`/api/v1/staff/${target.id}/reset-password`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ password: "BrandNewPassword123!" });
    expect(resetRes.status).toBe(200);

    // The refresh token issued before the reset must no longer work.
    const refreshAfterReset = await request(app)
      .post("/api/v1/auth/refresh")
      .send({ refreshToken: oldRefreshToken });
    expect(refreshAfterReset.status).toBe(401);

    // The old password no longer works; the new one does.
    const loginWithOldPassword = await request(app)
      .post("/api/v1/auth/login")
      .send({ identifier: "+900000000020", password: TEST_PASSWORD });
    expect(loginWithOldPassword.status).toBe(401);

    const loginWithNewPassword = await request(app)
      .post("/api/v1/auth/login")
      .send({ identifier: "+900000000020", password: "BrandNewPassword123!" });
    expect(loginWithNewPassword.status).toBe(200);
  });

  it("rejects a STAFF-role token with 403", async () => {
    await createStaff(prisma, { phone: "+900000000021", role: "STAFF" });
    const token = await loginAs(app, "+900000000021");
    const target = await createStaff(prisma, { phone: "+900000000022", role: "STAFF" });

    const res = await request(app)
      .patch(`/api/v1/staff/${target.id}/reset-password`)
      .set("Authorization", `Bearer ${token}`)
      .send({ password: "SomePassword123!" });

    expect(res.status).toBe(403);
  });
});
