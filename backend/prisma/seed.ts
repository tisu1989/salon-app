/**
 * Dev-only seed data - gets the app into a bookable state (an admin login, a
 * staff member with a schedule, a couple of services) so the REST API and the
 * WhatsApp bot can actually be exercised end-to-end without manual DB inserts.
 *
 * Run with: npx tsx prisma/seed.ts
 */
import bcrypt from "bcrypt";
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("DevPassword123!", 12);

  const admin = await db.staff.upsert({
    where: { phone: "+910000000001" },
    update: {},
    create: {
      name: "Priya Admin",
      phone: "+910000000001",
      email: "admin@salon.test",
      passwordHash,
      role: "ADMIN",
    },
  });

  const stylist = await db.staff.upsert({
    where: { phone: "+910000000002" },
    update: {},
    create: {
      name: "Asha Stylist",
      phone: "+910000000002",
      email: "asha@salon.test",
      passwordHash,
      role: "STAFF",
    },
  });

  // Mon-Sat 9:00-18:00, closed Sunday.
  await db.workingHours.deleteMany({ where: { staffId: stylist.id } });
  await db.workingHours.createMany({
    data: [1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({
      staffId: stylist.id,
      dayOfWeek,
      startTime: "09:00",
      endTime: "18:00",
    })),
  });

  const haircut = await db.service.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, name: "Haircut", category: "Hair", durationMinutes: 30, price: 300 },
  });

  const manicure = await db.service.upsert({
    where: { id: 2 },
    update: {},
    create: { id: 2, name: "Manicure", category: "Nails", durationMinutes: 45, price: 500 },
  });

  console.log("Seeded:");
  console.log("  Admin login:   phone=%s password=DevPassword123!", admin.phone);
  console.log(
    "  Staff login:   phone=%s password=DevPassword123! (id=%d)",
    stylist.phone,
    stylist.id,
  );
  console.log(
    "  Services:      %s (id=%d), %s (id=%d)",
    haircut.name,
    haircut.id,
    manicure.name,
    manicure.id,
  );
}

main()
  .catch((err: unknown) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
