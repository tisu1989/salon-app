import type { Request, Response } from "express";
import { AppError } from "../../middleware/error-handler.js";
import type { AuthService } from "../auth/auth.service.js";
import type { StaffRepository } from "./staff.repository.js";
import type { CreateStaffDto, CreateTimeOffDto, SetWorkingHoursDto } from "./staff.dto.js";

/** Shared by every handler here that takes a staff id from the URL. */
function parseStaffId(req: Request): number {
  const staffId = Number(req.params.id);
  if (!Number.isInteger(staffId) || staffId <= 0) {
    throw new AppError("VALIDATION_ERROR", "id must be a positive integer", 400);
  }
  return staffId;
}

export class StaffController {
  constructor(
    private readonly staffRepo: StaffRepository,
    private readonly authService: AuthService,
  ) {}

  listActive = async (_req: Request, res: Response): Promise<void> => {
    const staff = await this.staffRepo.findAllActive();
    // Allowlist fields explicitly - never let passwordHash reach the client.
    const safeStaff = staff.map((s) => ({
      id: s.id,
      name: s.name,
      phone: s.phone,
      email: s.email,
      role: s.role,
      isActive: s.isActive,
    }));
    res.status(200).json({ staff: safeStaff });
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

    res.status(201).json({
      staff: {
        id: staff.id,
        name: staff.name,
        phone: staff.phone,
        email: staff.email,
        role: staff.role,
        isActive: staff.isActive,
      },
    });
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
