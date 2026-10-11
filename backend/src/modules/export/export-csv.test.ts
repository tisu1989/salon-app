import { describe, expect, it } from "vitest";
import { buildAppointmentsCsv, type AppointmentExportRow } from "./export-csv.js";

function row(overrides: Partial<AppointmentExportRow> = {}): AppointmentExportRow {
  return {
    startTime: new Date(2026, 9, 11, 14, 30),
    customerName: "Ravi Kumar",
    customerPhone: "919999999999",
    serviceName: "Haircut",
    staffName: "Asha Stylist",
    status: "BOOKED",
    ...overrides,
  };
}

describe("buildAppointmentsCsv", () => {
  it("writes the header row even with no appointments", () => {
    expect(buildAppointmentsCsv([])).toBe("Date,Time,Customer,Phone,Service,Staff,Status");
  });

  it("writes one data row per appointment, formatted for a spreadsheet", () => {
    const csv = buildAppointmentsCsv([row()]);
    const lines = csv.split("\r\n");

    expect(lines[0]).toBe("Date,Time,Customer,Phone,Service,Staff,Status");
    expect(lines[1]).toBe("11 Oct,14:30,Ravi Kumar,919999999999,Haircut,Asha Stylist,BOOKED");
  });

  it("preserves row order (caller is responsible for sorting)", () => {
    const early = row({ startTime: new Date(2026, 9, 11, 9, 0), customerName: "First" });
    const late = row({ startTime: new Date(2026, 9, 11, 17, 0), customerName: "Second" });
    const csv = buildAppointmentsCsv([early, late]);

    const lines = csv.split("\r\n");
    expect(lines[1]).toContain("First");
    expect(lines[2]).toContain("Second");
  });

  it("quotes a field containing a comma", () => {
    const csv = buildAppointmentsCsv([row({ customerName: "Kumar, Ravi" })]);
    expect(csv).toContain('"Kumar, Ravi"');
  });

  it("quotes a field containing a double quote, doubling the inner quote", () => {
    const csv = buildAppointmentsCsv([row({ customerName: 'Ravi "The Barber" Kumar' })]);
    expect(csv).toContain('"Ravi ""The Barber"" Kumar"');
  });

  it("leaves a plain field unquoted", () => {
    const csv = buildAppointmentsCsv([row({ customerName: "Ravi Kumar" })]);
    expect(csv).toContain(",Ravi Kumar,");
  });
});
