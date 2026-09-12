/**
 * Pure retry/backoff rules for sending a queued notification. Kept
 * dependency-free (no Prisma, no WhatsApp client) so the "when should this
 * retry" logic can be unit tested without a database.
 */

/** Delay before retry N, indexed by (attempts so far - 1). The last entry repeats for any attempt beyond it. */
const BACKOFF_SECONDS = [60, 5 * 60, 15 * 60, 60 * 60];

/** After this many failed attempts, stop retrying for good. */
export const MAX_SEND_ATTEMPTS = 5;

export function hasExceededMaxAttempts(attempts: number): boolean {
  return attempts >= MAX_SEND_ATTEMPTS;
}

/**
 * Whether a notification that has failed `attempts` times (last tried at
 * `lastAttemptAt`) is due for another try right now. Never having been
 * attempted (attempts === 0) is always due - that's the normal first send,
 * not a retry.
 */
export function isDueForRetry(
  attempts: number,
  lastAttemptAt: Date | null,
  now: Date = new Date(),
): boolean {
  if (attempts === 0 || lastAttemptAt === null) {
    return true;
  }

  const backoffIndex = Math.min(attempts - 1, BACKOFF_SECONDS.length - 1);
  const waitSeconds = BACKOFF_SECONDS[backoffIndex]!;
  const dueAt = new Date(lastAttemptAt.getTime() + waitSeconds * 1000);

  return now >= dueAt;
}
