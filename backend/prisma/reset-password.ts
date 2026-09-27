/**
 * Resets a staff member's password directly against the database - for when nobody can log in
 * to use the normal admin "reset password" endpoint (e.g. the only admin forgot their own).
 *
 * Deliberately standalone: it does NOT import config/env.ts (which requires the full env schema -
 * JWT secrets, etc.), just DATABASE_URL and REDIS_URL, so it can run against a database with only
 * those two set, the same way create-admin.ts does.
 *
 *   DATABASE_URL="<target db>" REDIS_URL="<target redis>" STAFF_PHONE="+91..." \
 *   NEW_PASSWORD="<12+ chars>" npm run reset-password
 *
 * REDIS_URL is optional: without it the password still resets, but that staff member's old
 * refresh tokens stay valid (same trade-off documented in AuthService.changePassword/resetPassword,
 * which always revoke sessions - this script does too, when it can reach Redis).
 */
import bcrypt from "bcrypt";
import { PrismaClient } from "@prisma/client";

const MIN_PASSWORD_LENGTH = 12;

async function main() {
  const { STAFF_PHONE: phone, NEW_PASSWORD: password, REDIS_URL: redisUrl } = process.env;

  if (!phone || !password) {
    throw new Error("STAFF_PHONE and NEW_PASSWORD are required.");
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`NEW_PASSWORD must be at least ${MIN_PASSWORD_LENGTH} characters.`);
  }

  const db = new PrismaClient();
  try {
    const staff = await db.staff.findUnique({ where: { phone } });
    if (!staff) {
      throw new Error(`No staff account with phone ${phone} exists.`);
    }

    await db.staff.update({
      where: { phone },
      data: { passwordHash: await bcrypt.hash(password, 12) },
    });
    console.log(`Password reset for "${staff.name}" (id ${staff.id}, phone ${phone}).`);

    if (redisUrl) {
      const { Redis } = await import("ioredis");
      const redis = new Redis(redisUrl);
      const keys = await redis.keys(`auth:refresh:${staff.id}:*`);
      if (keys.length > 0) await redis.del(...keys);
      await redis.quit();
      console.log(`Revoked ${keys.length} existing session(s) - old logins are now signed out.`);
    } else {
      console.log("REDIS_URL not provided - existing sessions were NOT revoked.");
    }
  } finally {
    await db.$disconnect();
  }
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
