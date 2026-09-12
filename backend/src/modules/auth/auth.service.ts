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
  ): Promise<{ staff: AuthenticatedStaff; tokens: AuthTokens }> {
    const staff = await this.staffRepo.findByIdentifier(identifier);

    // Same error for "no such account" and "wrong password" - don't leak which one it was.
    const invalidCredentials = () =>
      new AppError("INVALID_CREDENTIALS", "Incorrect phone/email or password.", 401);

    if (!staff || !staff.isActive) {
      throw invalidCredentials();
    }

    const passwordMatches = await bcrypt.compare(password, staff.passwordHash);
    if (!passwordMatches) {
      throw invalidCredentials();
    }

    const tokens = await this.issueTokens(staff.id, staff.role);
    return { staff: toPublicStaff(staff), tokens };
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
