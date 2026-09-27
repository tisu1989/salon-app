/**
 * One-time cleanup for customers that were created before phone numbers were normalized
 * (see customer/phone.ts) - e.g. "919999999999" and "+919999999999" as two separate rows
 * for the same person. Finds every group of customers whose phone collapses to the same
 * normalized value, merges each group onto one survivor (the one with the most appointment
 * history, ties broken by the older record), and deletes the rest.
 *
 * Defaults to a dry run - prints what it would do without changing anything:
 *
 *   DATABASE_URL="<target db>" npm run merge-duplicate-customers
 *
 * Pass --apply to actually perform the merge:
 *
 *   DATABASE_URL="<target db>" npm run merge-duplicate-customers -- --apply
 */
import { PrismaClient } from "@prisma/client";
import { normalizePhone } from "../src/modules/customer/phone.js";

async function main() {
  const apply = process.argv.includes("--apply");
  const db = new PrismaClient();

  try {
    const customers = await db.customer.findMany({
      include: { _count: { select: { appointments: true } } },
      orderBy: { createdAt: "asc" },
    });

    const groups = new Map<string, typeof customers>();
    for (const customer of customers) {
      const key = normalizePhone(customer.phone);
      const group = groups.get(key) ?? [];
      group.push(customer);
      groups.set(key, group);
    }

    const duplicateGroups = [...groups.entries()].filter(([, group]) => group.length > 1);

    if (duplicateGroups.length === 0) {
      console.log("No duplicate customers found - nothing to do.");
      return;
    }

    for (const [normalizedPhone, group] of duplicateGroups) {
      // Most appointment history wins; an older record breaks a tie (createdAt asc above
      // means the first one already sorts earliest).
      const [survivor, ...duplicates] = [...group].sort(
        (a, b) => b._count.appointments - a._count.appointments,
      );
      if (!survivor) continue;

      console.log(
        `\n${normalizedPhone}: keeping customer ${survivor.id} (${survivor.name}, ` +
          `${survivor._count.appointments} appointment(s), stored as "${survivor.phone}")`,
      );
      for (const dup of duplicates) {
        console.log(
          `  merging customer ${dup.id} (${dup.name}, ${dup._count.appointments} appointment(s), ` +
            `stored as "${dup.phone}") into ${survivor.id}`,
        );
      }

      if (!apply) continue;

      await db.$transaction([
        ...duplicates.map((dup) =>
          db.appointment.updateMany({
            where: { customerId: dup.id },
            data: { customerId: survivor.id },
          }),
        ),
        ...duplicates.map((dup) => db.customer.delete({ where: { id: dup.id } })),
        db.customer.update({ where: { id: survivor.id }, data: { phone: normalizedPhone } }),
      ]);
    }

    console.log(apply ? "\nDone - duplicates merged." : "\nDry run only - pass --apply to merge.");
  } finally {
    await db.$disconnect();
  }
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
