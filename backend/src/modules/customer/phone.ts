/**
 * Collapses the different ways a phone number can be typed ("+91 99999-99999",
 * "919999999999", "9999999999") into one canonical form, so the same number always
 * matches regardless of how it was entered. Without this, exact-string lookups treat
 * "+919999999999" and "919999999999" as two different customers.
 */
export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) {
    return `91${digits}`;
  }
  return digits;
}
