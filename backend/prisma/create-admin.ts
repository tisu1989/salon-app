/**
 * Creates the first ADMIN account on a fresh (e.g. production) database.
 *
 * The app has no public signup, and prisma/seed.ts is dev-only (it hardcodes a known
 * password) - never run that against a public database. Use this instead:
 *
 *   DATABASE_URL="<target db>" ADMIN_NAME="Priya" ADMIN_PHONE="+91..." \
 *   ADMIN_PASSWORD="<12+ chars>" npm run create-admin
 *
 * The password comes from the environment, not an argument, so it doesn't end up in shell
 * history or the process list. Refuses to overwrite an existing account.
 */
import bcrypt from "bcrypt";
import { PrismaClient } from "@prisma/client";

const MIN_PASSWORD_LENGTH = 12;

async function main() {
  const { ADMIN_NAME: name, ADMIN_PHONE: phone, ADMIN_PASSWORD: password } = process.env;
  const email = process.env.ADMIN_EMAIL;

  if (!name || !phone || !password) {
    throw new Error("ADMIN_NAME, ADMIN_PHONE and ADMIN_PASSWORD are required.");
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`ADMIN_PASSWORD must be at least ${MIN_PASSWORD_LENGTH} characters.`);
  }

  const db = new PrismaClient();
  try {
    if (await db.staff.findUnique({ where: { phone } })) {
      throw new Error(`An account with phone ${phone} already exists - not overwriting it.`);
    }
    const admin = await db.staff.create({
      data: {
        name,
        phone,
        ...(email && { email }),
        passwordHash: await bcrypt.hash(password, 12),
        role: "ADMIN",
      },
    });
    console.log(`Created ADMIN "${admin.name}" (id ${admin.id}). Log in with phone ${phone}.`);
  } finally {
    await db.$disconnect();
  }
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
