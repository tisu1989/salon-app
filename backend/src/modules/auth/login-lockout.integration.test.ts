import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../../config/prisma.js";
import { redis } from "../../config/redis.js";
import { resetDatabase } from "../../test-support/reset-db.js";
import { TEST_PASSWORD, createStaff } from "../../test-support/factories.js";
import { StaffRepository } from "../staff/staff.repository.js";
import { AuthService } from "./auth.service.js";

const authService = new AuthService(new StaffRepository(prisma), redis);
const PHONE = "+900000000101";
const ATTACKER_IP = "203.0.113.7";
const OWNER_IP = "198.51.100.20";

beforeEach(async () => {
  await resetDatabase(prisma);
  await redis.flushdb();
});

afterAll(async () => {
  await prisma.$disconnect();
  redis.disconnect();
});

async function failLogins(identifier: string, ip: string, times: number) {
  for (let i = 0; i < times; i++) {
    await expect(authService.login(identifier, "wrong-password", ip)).rejects.toMatchObject({
      statusCode: 401,
    });
  }
}

describe("login lockout is scoped per client IP", () => {
  it("does not let an attacker lock the real owner out of their own account", async () => {
    await createStaff(prisma, { phone: PHONE, role: "STAFF" });

    await failLogins(PHONE, ATTACKER_IP, 5);
    await expect(authService.login(PHONE, TEST_PASSWORD, ATTACKER_IP)).rejects.toMatchObject({
      code: "TOO_MANY_ATTEMPTS",
    });

    const ownerLogin = await authService.login(PHONE, TEST_PASSWORD, OWNER_IP);
    expect(ownerLogin.staff.role).toBe("STAFF");
  });

  it("blocks one IP that sprays guesses across many accounts, without touching other IPs", async () => {
    await createStaff(prisma, { phone: PHONE, role: "STAFF" });

    // 30 failures spread over 30 different identifiers - each stays under the per-account cap.
    for (let i = 0; i < 30; i++) {
      await expect(
        authService.login(`+9000000009${String(i).padStart(2, "0")}`, "guess", ATTACKER_IP),
      ).rejects.toMatchObject({ statusCode: 401 });
    }

    await expect(authService.login(PHONE, TEST_PASSWORD, ATTACKER_IP)).rejects.toMatchObject({
      code: "TOO_MANY_ATTEMPTS",
    });
    await expect(authService.login(PHONE, TEST_PASSWORD, OWNER_IP)).resolves.toBeDefined();
  });
});
