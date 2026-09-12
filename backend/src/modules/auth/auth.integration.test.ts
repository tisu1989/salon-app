import request from "supertest";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../../app.js";
import { prisma } from "../../config/prisma.js";
import { redis } from "../../config/redis.js";
import { resetDatabase } from "../../test-support/reset-db.js";
import { TEST_PASSWORD, createStaff } from "../../test-support/factories.js";

const app = createApp();
const PHONE = "+900000000001";

beforeEach(async () => {
  await resetDatabase(prisma);
  await redis.flushdb();
});

afterAll(async () => {
  await prisma.$disconnect();
  redis.disconnect();
});

describe("POST /api/v1/auth/login", () => {
  it("returns tokens for a correct phone + password, without echoing sensitive fields", async () => {
    const staff = await createStaff(prisma, { phone: PHONE, role: "STAFF", name: "Priya" });

    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({ identifier: PHONE, password: TEST_PASSWORD });

    expect(res.status).toBe(200);
    expect(res.body.accessToken).toEqual(expect.any(String));
    expect(res.body.refreshToken).toEqual(expect.any(String));
    // Exactly {id, name, role} - no phone/passwordHash leaking into the response.
    expect(res.body.staff).toEqual({ id: staff.id, name: "Priya", role: "STAFF" });
  });

  it("rejects a wrong password with 401", async () => {
    await createStaff(prisma, { phone: PHONE, role: "STAFF" });

    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({ identifier: PHONE, password: "wrong-password" });

    expect(res.status).toBe(401);
    expect(res.body.code).toBe("INVALID_CREDENTIALS");
  });

  it("rejects an unknown identifier with the same error as a wrong password", async () => {
    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({ identifier: "+900000000999", password: "whatever" });

    expect(res.status).toBe(401);
    expect(res.body.code).toBe("INVALID_CREDENTIALS");
  });

  it("locks out after 5 failed attempts, even with the correct password on the 6th try", async () => {
    await createStaff(prisma, { phone: PHONE, role: "STAFF" });

    for (let i = 0; i < 5; i++) {
      const res = await request(app)
        .post("/api/v1/auth/login")
        .send({ identifier: PHONE, password: "wrong-password" });
      expect(res.status).toBe(401);
    }

    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({ identifier: PHONE, password: TEST_PASSWORD });

    expect(res.status).toBe(429);
    expect(res.body.code).toBe("TOO_MANY_ATTEMPTS");
  });
});

describe("POST /api/v1/auth/refresh", () => {
  it("issues a new token pair and invalidates the old refresh token", async () => {
    await createStaff(prisma, { phone: PHONE, role: "STAFF" });
    const login = await request(app)
      .post("/api/v1/auth/login")
      .send({ identifier: PHONE, password: TEST_PASSWORD });
    const originalRefreshToken = login.body.refreshToken as string;

    const refreshRes = await request(app)
      .post("/api/v1/auth/refresh")
      .send({ refreshToken: originalRefreshToken });

    expect(refreshRes.status).toBe(200);
    expect(refreshRes.body.refreshToken).not.toBe(originalRefreshToken);

    // The old refresh token was single-use - replaying it must now fail.
    const replay = await request(app)
      .post("/api/v1/auth/refresh")
      .send({ refreshToken: originalRefreshToken });
    expect(replay.status).toBe(401);
  });
});

describe("POST /api/v1/auth/logout", () => {
  it("revokes the session so its refresh token no longer works", async () => {
    await createStaff(prisma, { phone: PHONE, role: "STAFF" });
    const login = await request(app)
      .post("/api/v1/auth/login")
      .send({ identifier: PHONE, password: TEST_PASSWORD });

    const logoutRes = await request(app)
      .post("/api/v1/auth/logout")
      .set("Authorization", `Bearer ${login.body.accessToken}`);
    expect(logoutRes.status).toBe(204);

    const refreshAfterLogout = await request(app)
      .post("/api/v1/auth/refresh")
      .send({ refreshToken: login.body.refreshToken });
    expect(refreshAfterLogout.status).toBe(401);
  });
});
