import type { Request, Response } from "express";
import type { Staff } from "@prisma/client";
import { AppError } from "../../middleware/error-handler.js";
import type { AuthService } from "../auth/auth.service.js";
import type { StaffRepository } from "./staff.repository.js";
import type {
  CreateStaffDto,
  CreateTimeOffDto,
  ResetPasswordDto,
  SetWorkingHoursDto,
  UpdateStaffDto,
} from "./staff.dto.js";

/** Shared by every handler here that takes a staff id from the URL. */
function parseStaffId(req: Request): number {
  const staffId = Number(req.params.id);
  if (!Number.isInteger(staffId) || staffId <= 0) {
    throw new AppError("VALIDATION_ERROR", "id must be a positive integer", 400);
  }
  return staffId;
}

// Allowlist fields explicitly - never let passwordHash reach the client.
function toSafeStaff(s: Staff) {
  return {
    id: s.id,
    name: s.name,
    phone: s.phone,
    email: s.email,
    role: s.role,
    isActive: s.isActive,
  };
}

export class StaffController {
  constructor(
    private readonly staffRepo: StaffRepository,
    private readonly authService: AuthService,
  ) {}

  listActive = async (_req: Request, res: Response): Promise<void> => {
    const staff = await this.staffRepo.findAllActive();
    res.status(200).json({ staff: staff.map(toSafeStaff) });
  };

  /** Admin-only: provisions a login for a new staff member. */
  create = async (req: Request, res: Response): Promise<void> => {
    const dto = req.body as CreateStaffDto;
    const passwordHash = await this.authService.hashPassword(dto.password);

    const staff = await this.staffRepo.create({
      name: dto.name,
      phone: dto.phone,
      ...(dto.email !== undefined && { email: dto.email }),
      passwordHash,
      role: dto.role,
    });

    res.status(201).json({ staff: toSafeStaff(staff) });
  };

  /** Admin-only: edits name/email. Role and password changes deliberately go through other endpoints. */
  update = async (req: Request, res: Response): Promise<void> => {
    const staffId = parseStaffId(req);
    const dto = req.body as UpdateStaffDto;

    // Omit rather than pass `undefined` through - exactOptionalPropertyTypes
    // treats "key present with value undefined" and "key absent" as distinct,
    // and Prisma's update() input only accepts the latter.
    const staff = await this.staffRepo.update(staffId, {
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.email !== undefined && { email: dto.email }),
    });
    if (!staff) {
      throw new AppError("STAFF_NOT_FOUND", `Staff ${staffId} does not exist`, 404);
    }

    res.status(200).json({ staff: toSafeStaff(staff) });
  };

  /**
   * Admin-only: resets a staff member's password. No self-service flow exists
   * yet (that needs email delivery), so this is the only reset path today.
   * Also revokes every existing session of theirs - a password reset that
   * left old refresh tokens valid wouldn't actually lock anyone out.
   */
  resetPassword = async (req: Request, res: Response): Promise<void> => {
    const staffId = parseStaffId(req);
    const { password } = req.body as ResetPasswordDto;

    const passwordHash = await this.authService.hashPassword(password);
    const staff = await this.staffRepo.setPasswordHash(staffId, passwordHash);
    if (!staff) {
      throw new AppError("STAFF_NOT_FOUND", `Staff ${staffId} does not exist`, 404);
    }
    await this.authService.revokeAllSessions(staffId);

    res.status(200).json({ staff: toSafeStaff(staff) });
  };

  /**
   * Admin-only: soft-deletes a staff member (e.g. they've left) - existing
   * appointments are untouched. Also revokes their sessions: their current
   * access token still works until it naturally expires (JWTs are stateless -
   * that's the accepted tradeoff of the short 15min TTL), but they can't get a
   * new one once it does.
   */
  deactivate = async (req: Request, res: Response): Promise<void> => {
    const staffId = parseStaffId(req);

    const staff = await this.staffRepo.setActive(staffId, false);
    if (!staff) {
      throw new AppError("STAFF_NOT_FOUND", `Staff ${staffId} does not exist`, 404);
    }
    await this.authService.revokeAllSessions(staffId);

    res.status(200).json({ staff: toSafeStaff(staff) });
  };

  getWorkingHours = async (req: Request, res: Response): Promise<void> => {
    const staffId = parseStaffId(req);
    const workingHours = await this.staffRepo.getWorkingHours(staffId);
    res.status(200).json({ workingHours });
  };

  /** Admin-only: replaces this staff member's entire weekly schedule. */
  setWorkingHours = async (req: Request, res: Response): Promise<void> => {
    const staffId = parseStaffId(req);
    const { rules } = req.body as SetWorkingHoursDto;

    const staff = await this.staffRepo.findById(staffId);
    if (!staff) {
      throw new AppError("STAFF_NOT_FOUND", `Staff ${staffId} does not exist`, 404);
    }

    const workingHours = await this.staffRepo.replaceWorkingHours(staffId, rules);
    res.status(200).json({ workingHours });
  };

  listTimeOff = async (req: Request, res: Response): Promise<void> => {
    const staffId = parseStaffId(req);
    // Far horizon is fine here - this is a small admin/staff-facing list, not the availability hot path.
    const farFuture = new Date("2100-01-01");
    const timeOff = await this.staffRepo.getTimeOffInRange(staffId, new Date(0), farFuture);
    res.status(200).json({ timeOff });
  };

  /** Admin-only: blocks out time on this staff member's calendar (leave, breaks, etc). */
  createTimeOff = async (req: Request, res: Response): Promise<void> => {
    const staffId = parseStaffId(req);
    const dto = req.body as CreateTimeOffDto;

    const staff = await this.staffRepo.findById(staffId);
    if (!staff) {
      throw new AppError("STAFF_NOT_FOUND", `Staff ${staffId} does not exist`, 404);
    }

    const timeOff = await this.staffRepo.createTimeOff({
      staffId,
      startDateTime: dto.startDateTime,
      endDateTime: dto.endDateTime,
      ...(dto.reason !== undefined && { reason: dto.reason }),
    });

    res.status(201).json({ timeOff });
  };

  /** Admin-only: removes a time-off block. */
  deleteTimeOff = async (req: Request, res: Response): Promise<void> => {
    const staffId = parseStaffId(req);
    const timeOffId = Number(req.params.timeOffId);
    if (!Number.isInteger(timeOffId) || timeOffId <= 0) {
      throw new AppError("VALIDATION_ERROR", "timeOffId must be a positive integer", 400);
    }

    const deleted = await this.staffRepo.deleteTimeOff(staffId, timeOffId);
    if (!deleted) {
      throw new AppError("TIME_OFF_NOT_FOUND", `Time-off ${timeOffId} does not exist`, 404);
    }

    res.status(204).send();
  };
}
