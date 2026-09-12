import type { PrismaClient } from "@prisma/client";

// Deletion order matters here only because we're not using FOREIGN_KEY_CHECKS=0 -
// children before parents avoids FK constraint violations.
const TABLES_CHILDREN_FIRST = [
  "notification_logs",
  "appointments",
  "time_off",
  "working_hours",
  "customers",
  "services",
  "staff",
];

/**
 * Wipes every app table - used in `beforeEach` so each integration test starts
 * from a guaranteed-empty database instead of depending on leftover rows from
 * whichever test ran before it. Never call this against a non-test database;
 * there's no confirmation prompt, it just deletes everything.
 */
export async function resetDatabase(db: PrismaClient): Promise<void> {
  for (const table of TABLES_CHILDREN_FIRST) {
    await db.$executeRawUnsafe(`DELETE FROM \`${table}\`;`);
  }
}
