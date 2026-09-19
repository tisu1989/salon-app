import { rateLimit } from "express-rate-limit";

function limiter(windowMs: number, limit: number) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: { code: "RATE_LIMITED", message: "Too many requests. Please slow down." },
  });
}

/** Refresh-token redemption: a real client refreshes every ~15 minutes, so this is generous. */
export const refreshRateLimit = limiter(60_000, 30);

/**
 * The WhatsApp webhook is unauthenticated (signature-checked instead), so cap it per IP.
 * Sized well above Meta's normal delivery rate for a single salon number.
 */
export const webhookRateLimit = limiter(60_000, 300);
