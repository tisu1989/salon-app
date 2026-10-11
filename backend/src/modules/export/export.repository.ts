import type { Export, ExportType, Prisma, PrismaClient } from "@prisma/client";

export interface CreateExportInput {
  type: ExportType;
  params: Prisma.InputJsonValue;
  requestedById: number;
}

const exportListSelect = {
  id: true,
  type: true,
  status: true,
  params: true,
  fileName: true,
  error: true,
  requestedById: true,
  createdAt: true,
  completedAt: true,
} satisfies Prisma.ExportSelect;

/** An export row shaped for the exports list screen - never includes fileContent, which
 *  can be sizeable and is only ever needed by the download endpoint. */
export type ExportForListing = Prisma.ExportGetPayload<{ select: typeof exportListSelect }>;

export class ExportRepository {
  constructor(private readonly db: PrismaClient) {}

  async create(input: CreateExportInput): Promise<Export> {
    return this.db.export.create({ data: input });
  }

  async findById(id: number): Promise<Export | null> {
    return this.db.export.findUnique({ where: { id } });
  }

  /** The exports screen: most recent first. */
  async findRecent(limit = 20): Promise<ExportForListing[]> {
    return this.db.export.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
      select: exportListSelect,
    });
  }

  /** Still-queued exports, oldest first - fairness for whoever asked first. */
  async findPending(limit = 10): Promise<Export[]> {
    return this.db.export.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "asc" },
      take: limit,
    });
  }

  async markDone(id: number, fileName: string, fileContent: string): Promise<void> {
    await this.db.export.update({
      where: { id },
      data: { status: "DONE", fileName, fileContent, completedAt: new Date() },
    });
  }

  async markFailed(id: number, error: string): Promise<void> {
    await this.db.export.update({
      where: { id },
      data: { status: "FAILED", error, completedAt: new Date() },
    });
  }
}
