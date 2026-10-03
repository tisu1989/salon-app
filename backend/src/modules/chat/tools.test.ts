import { describe, expect, it } from "vitest";
import { toolsForRole } from "./tools.js";

function names(role: "STAFF" | "ADMIN"): string[] {
  return toolsForRole(role).map((t) => t.name);
}

describe("toolsForRole", () => {
  it("gives STAFF only the self-scoped tools", () => {
    expect(names("STAFF")).toEqual([
      "get_my_schedule",
      "mark_appointment_completed",
      "mark_appointment_no_show",
      "confirm_appointment",
    ]);
  });

  it("gives ADMIN every STAFF tool plus the business-wide ones", () => {
    const adminTools = names("ADMIN");
    for (const staffTool of names("STAFF")) {
      expect(adminTools).toContain(staffTool);
    }
    expect(adminTools).toEqual(
      expect.arrayContaining(["get_staff_schedule", "list_active_staff", "get_analytics_summary"]),
    );
  });

  it("never gives STAFF an admin-only tool", () => {
    const staffTools = names("STAFF");
    expect(staffTools).not.toContain("get_staff_schedule");
    expect(staffTools).not.toContain("list_active_staff");
    expect(staffTools).not.toContain("get_analytics_summary");
  });
});
