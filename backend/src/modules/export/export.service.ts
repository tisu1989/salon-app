import type { Export, ExportType } from "@prisma/client";
import { AppError } from "../../middleware/error-handler.js";
import type { AppointmentService } from "../appointment/appointment.service.js";
import type { CustomerRepository } from "../customer/customer.repository.js";
import type { ServiceRepository } from "../service/service.repository.js";
import type { StaffRepository } from "../staff/staff.repository.js";
import { buildAppointmentsCsv, type AppointmentExportRow } from "./export-csv.js";
import type { ExportForListing, ExportRepository } from "./export.repository.js";

export interface RequestExportInput {
  type: ExportType;
  date: Date;
  requestedById: number;
}

interface AppointmentsExportParams {
  [key: string]: string;
  date: string; // ISO - Export.params is JSON, so dates round-trip as strings
}

/**
 * Queues export requests and, separately, builds them. Mirrors the shape of
 * NotificationService on purpose: a DB row is the durable source of truth, requesting
 * something just writes a PENDING row and returns immediately, and a background worker
 * (export-worker.ts, same pattern as notification-worker.ts) calls processPending() on a
 * timer to actually do the work. No new queueing library - this app's volume doesn't need
 * one, and it's one less moving part to run on free-tier hosting.
 */
export class ExportService {
  constructor(
    private readonly exportRepo: ExportRepository,
    private readonly appointmentService: AppointmentService,
    private readonly customerRepo: CustomerRepository,
    private readonly serviceRepo: ServiceRepository,
    private readonly staffRepo: StaffRepository,
  ) {}

  async request(input: RequestExportInput): Promise<Export> {
    const params: AppointmentsExportParams = { date: input.date.toISOString() };
    return this.exportRepo.create({
      type: input.type,
      params,
      requestedById: input.requestedById,
    });
  }

  async list(limit?: number): Promise<ExportForListing[]> {
    return this.exportRepo.findRecent(limit);
  }

  /** The finished file for a DONE export. 404s if it doesn't exist, 409s if it's not ready yet. */
  async getDownload(id: number): Promise<{ fileName: string; content: string }> {
    const exported = await this.exportRepo.findById(id);
    if (!exported) {
      throw new AppError("EXPORT_NOT_FOUND", `Export ${id} does not exist`, 404);
    }
    if (exported.status !== "DONE" || !exported.fileContent || !exported.fileName) {
      throw new AppError("EXPORT_NOT_READY", `Export ${id} isn't ready yet.`, 409);
    }
    return { fileName: exported.fileName, content: exported.fileContent };
  }

  /** Builds every still-queued export. Called by the background worker's poll tick. */
  async processPending(): Promise<void> {
    const pending = await this.exportRepo.findPending();
    for (const exported of pending) {
      await this.processOne(exported);
    }
  }

  private async processOne(exported: Export): Promise<void> {
    try {
      // Safe to trust - this JSON column is only ever written by request() above, never
      // by anything outside this service.
      const { date } = exported.params as unknown as AppointmentsExportParams;
      const csv = await this.buildAppointmentsCsv(new Date(date));
      const fileName = `appointments-${date.slice(0, 10)}.csv`;
      await this.exportRepo.markDone(exported.id, fileName, csv);
    } catch (err) {
      console.error(`Export ${exported.id} failed:`, err);
      const message = err instanceof Error ? err.message : "Unknown error";
      await this.exportRepo.markFailed(exported.id, message);
    }
  }

  private async buildAppointmentsCsv(date: Date): Promise<string> {
    const appointments = await this.appointmentService.listForDay(date);

    const rows: AppointmentExportRow[] = await Promise.all(
      appointments.map(async (a) => {
        const [customer, service, staff] = await Promise.all([
          this.customerRepo.findById(a.customerId),
          this.serviceRepo.findById(a.serviceId),
          this.staffRepo.findById(a.staffId),
        ]);
        return {
          startTime: a.startTime,
          customerName: customer?.name ?? "Unknown customer",
          customerPhone: customer?.phone ?? "",
          serviceName: service?.name ?? "Unknown service",
          staffName: staff?.name ?? "Unknown staff",
          status: a.status,
        };
      }),
    );

    rows.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
    return buildAppointmentsCsv(rows);
  }
}
