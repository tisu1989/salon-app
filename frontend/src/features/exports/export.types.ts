export type ExportStatus = "PENDING" | "DONE" | "FAILED";

export interface ExportEntry {
  id: number;
  type: "APPOINTMENTS";
  status: ExportStatus;
  fileName: string | null;
  error: string | null;
  requestedById: number;
  createdAt: string;
  completedAt: string | null;
}
