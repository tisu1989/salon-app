import type { PrismaClient, Staff, TimeOff, WorkingHours } from "@prisma/client";

export class StaffRepository {
  constructor(private readonly db: PrismaClient) {}

  async findById(staffId: number): Promise<Staff | null> {
    return this.db.staff.findUnique({ where: { id: staffId } });
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
    });
  }
}
