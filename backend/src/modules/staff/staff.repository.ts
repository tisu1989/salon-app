import {
  Prisma,
  type PrismaClient,
  type Role,
  type Staff,
  type TimeOff,
  type WorkingHours,
} from "@prisma/client";

export interface CreateStaffInput {
  name: string;
  phone: string;
  email?: string;
  passwordHash: string;
  role: Role;
}

// Deliberately no explicit `| undefined` - Prisma's own generated update types
// don't allow it either under exactOptionalPropertyTypes, so callers must omit
// a key entirely rather than pass it as undefined (see staff.controller.ts's
// `omitUndefined` helper, used at the DTO -> this-input boundary).
export interface UpdateStaffInput {
  name?: string;
  email?: string | null;
  isActive?: boolean;
}

export class StaffRepository {
  constructor(private readonly db: PrismaClient) {}

  async findById(staffId: number): Promise<Staff | null> {
    return this.db.staff.findUnique({ where: { id: staffId } });
  }

  /** Looks up a staff member by phone or email for login - either can be used as the login identifier. */
  async findByIdentifier(identifier: string): Promise<Staff | null> {
    return this.db.staff.findFirst({
      where: { OR: [{ phone: identifier }, { email: identifier }] },
    });
  }

  async findAllActive(): Promise<Staff[]> {
    return this.db.staff.findMany({ where: { isActive: true }, orderBy: { name: "asc" } });
  }

  async create(input: CreateStaffInput): Promise<Staff> {
    return this.db.staff.create({ data: input });
  }

  /** Returns null if the staff member doesn't exist - callers decide whether that's a 404. */
  async update(staffId: number, input: UpdateStaffInput): Promise<Staff | null> {
    try {
      return await this.db.staff.update({ where: { id: staffId }, data: input });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
        return null;
      }
      throw err;
    }
  }

  async setActive(staffId: number, isActive: boolean): Promise<Staff | null> {
    return this.update(staffId, { isActive });
  }

  async getWorkingHours(staffId: number): Promise<WorkingHours[]> {
    return this.db.workingHours.findMany({ where: { staffId } });
  }

  /** Time-off blocks that overlap [rangeStart, rangeEnd) at all. */
  async getTimeOffInRange(staffId: number, rangeStart: Date, rangeEnd: Date): Promise<TimeOff[]> {
    return this.db.timeOff.findMany({
      where: {
        staffId,
        startDateTime: { lt: rangeEnd },
        endDateTime: { gt: rangeStart },
      },
      orderBy: { startDateTime: "asc" },
    });
  }

  /**
   * Replaces this staff member's entire weekly schedule in one shot - simpler for
   * callers than diffing individual days, and `@@unique([staffId, dayOfWeek])`
   * means there's at most one rule per day anyway.
   */
  async replaceWorkingHours(
    staffId: number,
    rules: WorkingHoursRuleInput[],
  ): Promise<WorkingHours[]> {
    return this.db.$transaction(async (tx) => {
      await tx.workingHours.deleteMany({ where: { staffId } });
      if (rules.length === 0) {
        return [];
      }
      await tx.workingHours.createMany({
        data: rules.map((r) => ({ staffId, ...r })),
      });
      return tx.workingHours.findMany({ where: { staffId }, orderBy: { dayOfWeek: "asc" } });
    });
  }

  async createTimeOff(input: CreateTimeOffInput): Promise<TimeOff> {
    return this.db.timeOff.create({ data: input });
  }

  /** Returns false if the row didn't exist (or belonged to a different staff member) - no-op either way. */
  async deleteTimeOff(staffId: number, timeOffId: number): Promise<boolean> {
    const result = await this.db.timeOff.deleteMany({ where: { id: timeOffId, staffId } });
    return result.count > 0;
  }
}

export interface WorkingHoursRuleInput {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

export interface CreateTimeOffInput {
  staffId: number;
  startDateTime: Date;
  endDateTime: Date;
  reason?: string;
}
