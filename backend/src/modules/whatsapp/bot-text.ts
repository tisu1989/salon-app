/**
 * Pure text-parsing helpers for the WhatsApp bot conversation. Kept dependency-free
 * (no Redis, no Prisma, no WhatsApp client) so the fiddly "what did the customer type"
 * logic can be unit tested without mocking the whole conversation.
 */

/** True if the customer wants to abandon whatever they were doing and start over. */
export function isResetCommand(text: string): boolean {
  return ["cancel", "restart", "start over", "menu"].includes(text.trim().toLowerCase());
}

/**
 * Resolves a 1-based numeric reply (as a customer would type "2") against a list of
 * options. Returns null for anything that isn't a valid selection - a blank message,
 * "yes", an out-of-range number, etc.
 */
export function resolveNumberedSelection<T>(text: string, options: readonly T[]): T | null {
  const trimmed = text.trim();
  if (!/^\d+$/.test(trimmed)) {
    return null;
  }
  const index = Number(trimmed) - 1;
  return index >= 0 && index < options.length ? options[index]! : null;
}

/**
 * Parses "today", "tomorrow", or a "DD-MM" / "DD/MM" date into a real Date at
 * midnight local time. Assumes the current year, rolling over to next year if
 * that date has already passed this year (so "01-01" in December means next Jan 1st).
 */
export function parseRequestedDate(text: string, now: Date = new Date()): Date | null {
  const trimmed = text.trim().toLowerCase();

  if (trimmed === "today") {
    return startOfDay(now);
  }
  if (trimmed === "tomorrow") {
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return startOfDay(tomorrow);
  }

  const match = /^(\d{1,2})[/-](\d{1,2})$/.exec(trimmed);
  if (!match) {
    return null;
  }
  const day = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }

  const candidate = new Date(now.getFullYear(), month - 1, day);
  if (candidate.getMonth() !== month - 1 || candidate.getDate() !== day) {
    return null; // e.g. "31-04" - not a real date
  }

  const today = startOfDay(now);
  if (candidate < today) {
    candidate.setFullYear(candidate.getFullYear() + 1);
  }
  return candidate;
}

/** Formats a Date's local time as "HH:mm" for display in bot messages - e.g. "09:30". */
export function formatTime24h(date: Date): string {
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}

function startOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}
