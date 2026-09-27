/** YYYY-MM-DD in the browser's local timezone - matches what <input type="date"> uses. */
export function toDateInputValue(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

/**
 * Parses a "YYYY-MM-DD" string (e.g. from <input type="date">) as a LOCAL date at
 * midnight - not `new Date("2026-09-27")`, which JS parses as UTC midnight and can
 * report the wrong day-of-week/date once converted to local time. This exact bug hit
 * the backend's availability logic; don't repeat it here.
 */
export function parseDateInputValue(dateKey: string): Date {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year ?? 1970, (month ?? 1) - 1, day ?? 1);
}
