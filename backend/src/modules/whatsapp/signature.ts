import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "../../config/env.js";

/**
 * Verifies Meta's `X-Hub-Signature-256` header against the raw request body, so
 * we only act on webhook calls that genuinely came from WhatsApp.
 *
 * WHATSAPP_APP_SECRET is optional in env.ts (the app runs fine without a
 * configured WhatsApp integration) - if it's unset we skip verification and log
 * a warning rather than reject every call, since there's nothing to check against.
 */
export function isValidWebhookSignature(
  rawBody: Buffer,
  signatureHeader: string | undefined,
): boolean {
  if (!env.WHATSAPP_APP_SECRET) {
    console.warn("WHATSAPP_APP_SECRET not configured - skipping webhook signature verification.");
    return true;
  }

  if (!signatureHeader?.startsWith("sha256=")) {
    return false;
  }

  const expected = createHmac("sha256", env.WHATSAPP_APP_SECRET).update(rawBody).digest("hex");
  const provided = signatureHeader.slice("sha256=".length);

  const expectedBuffer = Buffer.from(expected, "hex");
  const providedBuffer = Buffer.from(provided, "hex");

  // timingSafeEqual throws on length mismatch instead of returning false.
  if (expectedBuffer.length !== providedBuffer.length) {
    return false;
  }
  return timingSafeEqual(expectedBuffer, providedBuffer);
}
