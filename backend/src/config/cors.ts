import type { CorsOptions } from "cors";

const DEV_DEFAULT_ORIGINS = ["http://localhost:5183", "http://localhost:5173"];

/**
 * Which browser origins may call the API. Explicit CORS_ORIGINS always wins; with none set,
 * non-production allows the local Vite ports and production allows no cross-origin access -
 * an unconfigured deploy fails closed instead of answering every website on the internet.
 */
export function resolveAllowedOrigins(
  configured: string | undefined,
  nodeEnv: "development" | "test" | "production",
): string[] {
  if (configured) {
    return configured
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean);
  }
  return nodeEnv === "production" ? [] : DEV_DEFAULT_ORIGINS;
}

export function buildCorsOptions(allowedOrigins: string[]): CorsOptions {
  return {
    // Requests with no Origin header (curl, server-to-server, Meta's webhook) aren't browser
    // cross-origin calls, so CORS doesn't apply to them - only browsers send Origin.
    origin: (origin, callback) => callback(null, !origin || allowedOrigins.includes(origin)),
  };
}
