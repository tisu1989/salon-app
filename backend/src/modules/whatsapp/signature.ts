import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "../../config/env.js";

/**
 * Verifies Meta's `X-Hub-Signature-256` header against the raw request body, so
 * we only act on webhook calls that genuinely came from WhatsApp.
 *
 * WHATSAPP_APP_SECRET is optional in env.ts (the app runs fine without a
 * configured WhatsApp integration), but /webhook is unauthenticated - so with no
 * secret to verify against, this fails closed and rejects every call rather than
 * letting anyone on the internet forge inbound messages.
 */
export function isValidWebhookSignature(
  rawBody: Buffer,
  signatureHeader: string | undefined,
): boolean {
  if (!env.WHATSAPP_APP_SECRET) {
    console.warn("WHATSAPP_APP_SECRET not configured - rejecting webhook call.");
    return false;
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
