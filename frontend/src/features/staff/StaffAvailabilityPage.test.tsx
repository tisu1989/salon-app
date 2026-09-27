import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { API, server } from "../../test/server";
import { renderWithProviders } from "../../test/render";
import { StaffAvailabilityPage } from "./StaffAvailabilityPage";

const asha = { id: 2, name: "Asha Stylist", phone: "+910000000002", email: null, role: "STAFF", isActive: true };
const raj = { id: 3, name: "Raj", phone: "+910000000003", email: null, role: "STAFF", isActive: true };

function fakeBackend() {
  server.use(
    http.get(`${API}/staff`, () => HttpResponse.json({ staff: [asha, raj] })),
    http.get(`${API}/staff/2/working-hours`, () =>
      HttpResponse.json({
        workingHours: [
          { id: 1, staffId: 2, dayOfWeek: 1, startTime: "09:00", endTime: "18:00" },
          { id: 2, staffId: 2, dayOfWeek: 2, startTime: "09:00", endTime: "18:00" },
        ],
      }),
    ),
    http.get(`${API}/staff/2/time-off`, () => HttpResponse.json({ timeOff: [] })),
    // Raj works every day, but has a leave block on the date under test.
    http.get(`${API}/staff/3/working-hours`, () =>
      HttpResponse.json({
        workingHours: Array.from({ length: 7 }, (_, dayOfWeek) => ({
          id: dayOfWeek + 10,
          staffId: 3,
          dayOfWeek,
          startTime: "10:00",
          endTime: "19:00",
        })),
      }),
    ),
    http.get(`${API}/staff/3/time-off`, () =>
      HttpResponse.json({
        timeOff: [
          // Comfortably inside 27 Sep in any real-world timezone (unlike a boundary
          // like 23:59 UTC, which is already the next local day somewhere like IST).
          {
            id: 1,
            staffId: 3,
            startDateTime: "2026-09-27T04:00:00.000Z",
            endDateTime: "2026-09-27T12:00:00.000Z",
            reason: "Family event",
          },
        ],
      }),
    ),
  );
}

describe("StaffAvailabilityPage", () => {
  it("shows each staff member's real status for the selected date", async () => {
    fakeBackend();
    const user = userEvent.setup();
    renderWithProviders(<StaffAvailabilityPage />);

    // Sunday 27 Sep 2026 - Asha has no rule for Sunday at all.
    await user.clear(screen.getByLabelText("Date"));
    await user.type(screen.getByLabelText("Date"), "2026-09-27");

    expect(await screen.findByText("Not scheduled")).toBeInTheDocument();
    expect(await screen.findByText("On leave")).toBeInTheDocument();
    expect(screen.getByText(/Family event/)).toBeInTheDocument();
  });

  it("shows a working staff member's actual hours when nothing blocks their day", async () => {
    fakeBackend();
    const user = userEvent.setup();
    renderWithProviders(<StaffAvailabilityPage />);

    // Monday 28 Sep 2026 - Asha works, Raj isn't on leave that day.
    await user.clear(screen.getByLabelText("Date"));
    await user.type(screen.getByLabelText("Date"), "2026-09-28");

    expect(await screen.findByText("Working 09:00–18:00")).toBeInTheDocument();
    expect(await screen.findByText("Working 10:00–19:00")).toBeInTheDocument();
  });
});
