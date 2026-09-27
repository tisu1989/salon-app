import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { API, server } from "../../test/server";
import { renderWithProviders } from "../../test/render";
import { formatTime } from "../../lib/date";
import { AppointmentDetailPage } from "./AppointmentDetailPage";

const customer = { id: 7, name: "Meera Shah", phone: "+919800000007" };
const service = { id: 2, name: "Haircut", durationMinutes: 30, price: "300", isActive: true };
const staff = { id: 3, name: "Asha Stylist", role: "STAFF" };

function appointment(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 42,
    customerId: 7,
    serviceId: 2,
    staffId: 3,
    startTime: "2026-09-21T09:00:00.000Z",
    endTime: "2026-09-21T09:30:00.000Z",
    status: "BOOKED",
    source: "STAFF",
    createdById: 1,
    ...overrides,
  };
}

function fakeBackend(apt: ReturnType<typeof appointment>) {
  server.use(
    http.get(`${API}/appointments/42`, () => HttpResponse.json({ appointment: apt })),
    http.get(`${API}/customers/7`, () => HttpResponse.json({ customer })),
    http.get(`${API}/services`, () => HttpResponse.json({ services: [service] })),
    http.get(`${API}/staff`, () => HttpResponse.json({ staff: [staff] })),
  );
}

function renderDetail() {
  return renderWithProviders(
    <Routes>
      <Route path="/appointments/:id" element={<AppointmentDetailPage />} />
    </Routes>,
    { route: "/appointments/42" },
  );
}

describe("AppointmentDetailPage", () => {
  it("shows the customer, service, staff and time for a booked appointment", async () => {
    fakeBackend(appointment());
    renderDetail();

    expect(await screen.findByText("Meera Shah")).toBeInTheDocument();
    expect(screen.getByText(/Haircut \(30 min/)).toBeInTheDocument();
    expect(screen.getByText("Asha Stylist")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Confirm" })).toBeInTheDocument();
  });

  it("hides every action and the reschedule option once the appointment is cancelled", async () => {
    fakeBackend(appointment({ status: "CANCELLED" }));
    renderDetail();

    await screen.findByText("Meera Shah");
    expect(screen.queryByRole("button", { name: "Confirm" })).not.toBeInTheDocument();
    expect(screen.queryByText("Reschedule")).not.toBeInTheDocument();
  });

  it("reschedules to the slot the user picks, and the page reflects the new time", async () => {
    fakeBackend(appointment());
    const slots = [
      { start: "2026-09-22T10:00:00.000Z", end: "2026-09-22T10:30:00.000Z" },
      { start: "2026-09-22T10:15:00.000Z", end: "2026-09-22T10:45:00.000Z" },
    ];
    let sentBody: unknown;
    server.use(
      http.get(`${API}/appointments/availability`, ({ request }) => {
        // The current appointment's own id must always be excluded, or reschedule would
        // treat its own current slot as unavailable.
        const url = new URL(request.url);
        expect(url.searchParams.get("excludeAppointmentId")).toBe("42");
        return HttpResponse.json({ slots });
      }),
      http.patch(`${API}/appointments/42/reschedule`, async ({ request }) => {
        sentBody = await request.json();
        return HttpResponse.json({
          appointment: appointment({ startTime: slots[1]!.start, endTime: slots[1]!.end }),
        });
      }),
    );
    const user = userEvent.setup();
    renderDetail();

    await screen.findByText("Meera Shah");
    await user.click(screen.getByRole("button", { name: "Pick a new time" }));
    await user.click(await screen.findByRole("button", { name: formatTime(slots[1]!.start) }));
    await user.click(screen.getByRole("button", { name: "Confirm new time" }));

    await waitFor(() => expect(sentBody).toEqual({ startTime: slots[1]!.start, endTime: slots[1]!.end }));
    // The reschedule panel closes and the header time updates from the refetched appointment.
    expect(screen.queryByRole("button", { name: "Confirm new time" })).not.toBeInTheDocument();
  });

  it("shows an error and stays open when the picked slot was just taken", async () => {
    fakeBackend(appointment());
    const slot = { start: "2026-09-22T10:00:00.000Z", end: "2026-09-22T10:30:00.000Z" };
    server.use(
      http.get(`${API}/appointments/availability`, () => HttpResponse.json({ slots: [slot] })),
      http.patch(`${API}/appointments/42/reschedule`, () =>
        HttpResponse.json(
          { code: "SLOT_UNAVAILABLE", message: "This time slot is no longer available." },
          { status: 409 },
        ),
      ),
    );
    const user = userEvent.setup();
    renderDetail();

    await screen.findByText("Meera Shah");
    await user.click(screen.getByRole("button", { name: "Pick a new time" }));
    await user.click(await screen.findByRole("button", { name: formatTime(slot.start) }));
    await user.click(screen.getByRole("button", { name: "Confirm new time" }));

    expect(await screen.findByText(/may have just been taken/)).toBeInTheDocument();
    // Stays on the reschedule panel rather than silently closing.
    expect(screen.getByRole("button", { name: "Confirm new time" })).toBeInTheDocument();
  });
});
