import { randomUUID } from "node:crypto";
import bcrypt from "bcrypt";
import type { Redis } from "ioredis";
import type { Role, Staff } from "@prisma/client";
import { AppError } from "../../middleware/error-handler.js";
import type { StaffRepository } from "../staff/staff.repository.js";
import { env } from "../../config/env.js";
import {
  durationStringToSeconds,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "./jwt.js";

const BCRYPT_ROUNDS = 12;
const REFRESH_TOKEN_TTL_SECONDS = durationStringToSeconds(env.JWT_REFRESH_EXPIRES_IN);

// Two independent counters share one 15-minute window (started by the first failure):
//  - per identifier + IP: 5 failures blocks that IP from that account. Keyed on IP too so a
//    stranger who knows a staff phone number can only lock out their own address, not the
//    real owner from theirs.
//  - per IP alone: 30 failures blocks that IP entirely, so one address cannot spray guesses
//    across many accounts while staying under the per-account limit.
const MAX_FAILED_LOGIN_ATTEMPTS = 5;
const MAX_FAILED_LOGIN_ATTEMPTS_PER_IP = 30;
const LOGIN_LOCKOUT_WINDOW_SECONDS = 15 * 60;

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthenticatedStaff {
  id: number;
  name: string;
  role: Role;
}

function toPublicStaff(staff: Staff): AuthenticatedStaff {
  return { id: staff.id, name: staff.name, role: staff.role };
}

function refreshTokenKey(staffId: number, jti: string): string {
  return `auth:refresh:${staffId}:${jti}`;
}

function loginFailuresKey(identifier: string, ip: string): string {
  return `auth:login-fails:${ip}:${identifier}`;
}

function ipFailuresKey(ip: string): string {
  return `auth:login-fails-ip:${ip}`;
}

export class AuthService {
  constructor(
    private readonly staffRepo: StaffRepository,
    private readonly redis: Redis,
  ) {}

  /** Hashes a plaintext password for storage - used when creating/resetting a staff account. */
  async hashPassword(plainTextPassword: string): Promise<string> {
    return bcrypt.hash(plainTextPassword, BCRYPT_ROUNDS);
  }

  async login(
    identifier: string,
    password: string,
    ip: string,
  ): Promise<{ staff: AuthenticatedStaff; tokens: AuthTokens }> {
    const failuresKey = loginFailuresKey(identifier, ip);
    const ipKey = ipFailuresKey(ip);

    const [failedAttempts, failedFromIp] = (await this.redis.mget(failuresKey, ipKey)).map(
      (count) => Number(count) || 0,
    ) as [number, number];
    if (
      failedAttempts >= MAX_FAILED_LOGIN_ATTEMPTS ||
      failedFromIp >= MAX_FAILED_LOGIN_ATTEMPTS_PER_IP
    ) {
      throw new AppError(
        "TOO_MANY_ATTEMPTS",
        "Too many failed login attempts. Please try again in a few minutes.",
        429,
      );
    }

    const staff = await this.staffRepo.findByIdentifier(identifier);

    // Same error for "no such account" and "wrong password" - don't leak which one it was.
    const invalidCredentials = () =>
      new AppError("INVALID_CREDENTIALS", "Incorrect phone/email or password.", 401);

    if (!staff || !staff.isActive) {
      await this.recordFailedLogin(failuresKey, ipKey);
      throw invalidCredentials();
    }

    const passwordMatches = await bcrypt.compare(password, staff.passwordHash);
    if (!passwordMatches) {
      await this.recordFailedLogin(failuresKey, ipKey);
      throw invalidCredentials();
    }

    // A correct password always clears any prior failures for this identifier.
    await this.redis.del(failuresKey);

    const tokens = await this.issueTokens(staff.id, staff.role);
    return { staff: toPublicStaff(staff), tokens };
  }

  private async recordFailedLogin(...keys: string[]): Promise<void> {
    for (const key of keys) {
      const attemptsInWindow = await this.redis.incr(key);
      if (attemptsInWindow === 1) {
        await this.redis.expire(key, LOGIN_LOCKOUT_WINDOW_SECONDS);
      }
    }
  }

  /**
   * Verifies a refresh token, rotates it (old one is invalidated immediately so a
   * stolen-and-replayed token can't be reused), and issues a fresh token pair.
   */
  async refresh(refreshToken: string): Promise<AuthTokens> {
    const invalidToken = () => new AppError("INVALID_REFRESH_TOKEN", "Please log in again.", 401);

    let payload;
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch {
      throw invalidToken();
    }

    const key = refreshTokenKey(payload.sub, payload.jti);
    const isKnown = await this.redis.exists(key);
    if (!isKnown) {
      throw invalidToken();
    }
    await this.redis.del(key);

    const staff = await this.staffRepo.findById(payload.sub);
    if (!staff || !staff.isActive) {
      throw invalidToken();
    }

    return this.issueTokens(staff.id, staff.role);
  }

  /** The logged-in staff member's own profile - what GET /auth/me returns after a token refresh. */
  async me(staffId: number): Promise<AuthenticatedStaff> {
    const staff = await this.staffRepo.findById(staffId);
    if (!staff || !staff.isActive) {
      throw new AppError("STAFF_NOT_FOUND", "Account no longer exists.", 404);
    }
    return toPublicStaff(staff);
  }

  /**
   * Self-service password change - requires the current password, unlike the admin
   * reset endpoint. Revokes every other refresh token afterwards (same reasoning as
   * an admin reset: a password change that left old sessions valid wouldn't actually
   * secure the account), but this request's own access token stays valid until it
   * naturally expires.
   */
  async changePassword(
    staffId: number,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const staff = await this.staffRepo.findById(staffId);
    if (!staff || !staff.isActive) {
      throw new AppError("STAFF_NOT_FOUND", "Account no longer exists.", 404);
    }

    const passwordMatches = await bcrypt.compare(currentPassword, staff.passwordHash);
    if (!passwordMatches) {
      throw new AppError("INVALID_CREDENTIALS", "Current password is incorrect.", 401);
    }

    const passwordHash = await this.hashPassword(newPassword);
    await this.staffRepo.setPasswordHash(staffId, passwordHash);
    await this.revokeAllSessions(staffId);
  }

  /** Revokes every refresh token issued to this staff member (e.g. on logout or password change). */
  async revokeAllSessions(staffId: number): Promise<void> {
    const keys = await this.redis.keys(refreshTokenKey(staffId, "*"));
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }

  private async issueTokens(staffId: number, role: Role): Promise<AuthTokens> {
    const jti = randomUUID();
    await this.redis.set(refreshTokenKey(staffId, jti), "1", "EX", REFRESH_TOKEN_TTL_SECONDS);

    return {
      accessToken: signAccessToken({ sub: staffId, role }),
      refreshToken: signRefreshToken({ sub: staffId, jti }),
    };
  }
}
