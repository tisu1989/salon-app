import { formatShortDate } from "../../utils/format-date.js";
import { formatTime24h } from "../whatsapp/bot-text.js";

export interface AppointmentExportRow {
  startTime: Date;
  customerName: string;
  customerPhone: string;
  serviceName: string;
  staffName: string;
  status: string;
}

const HEADER = ["Date", "Time", "Customer", "Phone", "Service", "Staff", "Status"];

/**
 * Builds a CSV from appointment rows - pure and dependency-free (no DB, no HTTP) so the
 * fiddly formatting/escaping can be unit tested directly, matching this codebase's
 * convention for logic like this (see bot-text.ts, availability.ts).
 */
export function buildAppointmentsCsv(rows: AppointmentExportRow[]): string {
  const lines = [
    HEADER,
    ...rows.map((r) => [
      formatShortDate(r.startTime),
      formatTime24h(r.startTime),
      r.customerName,
      r.customerPhone,
      r.serviceName,
      r.staffName,
      r.status,
    ]),
  ];
  return lines.map((line) => line.map(csvEscape).join(",")).join("\r\n");
}

/** Quotes a field if it contains a comma, quote or newline, per the standard CSV convention. */
function csvEscape(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
