import bcrypt from "bcrypt";
import type { Express } from "express";
import request from "supertest";
import type { PrismaClient, Role } from "@prisma/client";

const TEST_PASSWORD = "TestPassword123!";

export async function createStaff(
  db: PrismaClient,
  overrides: { phone: string; role: Role; name?: string },
) {
  const passwordHash = await bcrypt.hash(TEST_PASSWORD, 4); // low cost factor - tests don't need real security
  return db.staff.create({
    data: {
      name: overrides.name ?? "Test Staff",
      phone: overrides.phone,
      passwordHash,
      role: overrides.role,
    },
  });
}

export async function createService(
  db: PrismaClient,
  overrides: { name?: string; durationMinutes?: number; price?: number } = {},
) {
  return db.service.create({
    data: {
      name: overrides.name ?? "Test Service",
      durationMinutes: overrides.durationMinutes ?? 30,
      price: overrides.price ?? 100,
    },
  });
}

export async function createCustomer(
  db: PrismaClient,
  overrides: { phone: string; name?: string },
) {
  return db.customer.create({
    data: { name: overrides.name ?? "Test Customer", phone: overrides.phone },
  });
}

/** Mon-Sun (0-6) 9:00-18:00 for the given staff member - a permissive default schedule for tests. */
export async function createWorkingHoursAllWeek(db: PrismaClient, staffId: number) {
  await db.workingHours.createMany({
    data: [0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({
      staffId,
      dayOfWeek,
      startTime: "09:00",
      endTime: "18:00",
    })),
  });
}

/** Logs in via the real /auth/login route (not a shortcut) and returns the access token. */
export async function loginAs(app: Express, phone: string): Promise<string> {
  const res = await request(app)
    .post("/api/v1/auth/login")
    .send({ identifier: phone, password: TEST_PASSWORD });

  if (res.status !== 200) {
    throw new Error(`loginAs(${phone}) failed: ${res.status} ${JSON.stringify(res.body)}`);
  }
  return res.body.accessToken as string;
}

export { TEST_PASSWORD };
