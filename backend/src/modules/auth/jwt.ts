import jwt, { type SignOptions } from "jsonwebtoken";
import type { Role } from "@prisma/client";
import { env } from "../../config/env.js";

// env.JWT_*_EXPIRES_IN is validated at startup (env.ts) but typed as a plain string;
// jsonwebtoken's types want its narrower `ms` StringValue literal type, so we cast once here.
const ACCESS_TOKEN_EXPIRES_IN = env.JWT_ACCESS_EXPIRES_IN as NonNullable<SignOptions["expiresIn"]>;
const REFRESH_TOKEN_EXPIRES_IN = env.JWT_REFRESH_EXPIRES_IN as NonNullable<
  SignOptions["expiresIn"]
>;

export interface AccessTokenPayload {
  sub: number;
  role: Role;
}

export interface RefreshTokenPayload {
  sub: number;
  /** Unique id for this refresh token - lets us store/revoke individual tokens in Redis. */
  jti: string;
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRES_IN });
}

export function signRefreshToken(payload: RefreshTokenPayload): string {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRES_IN });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  // jwt.verify's return type covers the plain-string-payload case too, which we never
  // produce ourselves - safe to force through `unknown` down to our own payload shape.
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as unknown as AccessTokenPayload;
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as unknown as RefreshTokenPayload;
}

const DURATION_UNIT_SECONDS: Record<string, number> = {
  s: 1,
  m: 60,
  h: 60 * 60,
  d: 60 * 60 * 24,
};

/**
 * Parses a jsonwebtoken-style duration string ("15m", "7d", "30s") into seconds,
 * so we can set a matching TTL on the Redis record for a refresh token.
 */
export function durationStringToSeconds(duration: string): number {
  const match = /^(\d+)([smhd])$/.exec(duration.trim());
  if (!match) {
    throw new Error(`Unsupported duration format: "${duration}"`);
  }
  const [, amount, unit] = match;
  return Number(amount!) * DURATION_UNIT_SECONDS[unit!]!;
}
