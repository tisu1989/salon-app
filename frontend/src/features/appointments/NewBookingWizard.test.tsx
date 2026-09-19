import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { formatTime } from "../../lib/date";
import { API, server } from "../../test/server";
import { renderWithProviders } from "../../test/render";
import { NewBookingWizard } from "./NewBookingWizard";

const customer = { id: 7, name: "Meera Shah", phone: "+919800000007" };
const service = { id: 2, name: "Haircut", category: "Hair", durationMinutes: 30, price: "300", isActive: true };
const staff = { id: 3, name: "Asha Stylist", phone: "+910000000002", email: null, role: "STAFF", isActive: true };
const slots = [
  { start: "2026-09-21T09:00:00.000Z", end: "2026-09-21T09:30:00.000Z" },
  { start: "2026-09-21T09:30:00.000Z", end: "2026-09-21T10:00:00.000Z" },
];

function fakeBackend(onBook: (body: unknown) => void) {
  server.use(
    http.get(`${API}/customers`, () => HttpResponse.json({ customers: [customer] })),
    http.get(`${API}/services`, () => HttpResponse.json({ services: [service] })),
    http.get(`${API}/staff`, () => HttpResponse.json({ staff: [staff] })),
    http.get(`${API}/appointments/availability`, () => HttpResponse.json({ slots })),
    http.post(`${API}/appointments`, async ({ request }) => {
      const body = await request.json();
      onBook(body);
      return HttpResponse.json({ appointment: { id: 99, ...(body as object), status: "BOOKED" } }, { status: 201 });
    }),
  );
}

function renderWizard() {
  return renderWithProviders(
    <Routes>
      <Route path="/appointments/new" element={<NewBookingWizard />} />
      <Route path="/" element={<h1>Today's Board</h1>} />
    </Routes>,
    { route: "/appointments/new" },
  );
}

describe("NewBookingWizard", () => {
  it("locks every step after the first until you've made the earlier choices", () => {
    renderWizard();

    expect(screen.getByRole("button", { name: /Customer/ })).toBeEnabled();
    for (const later of [/Service/, /Staff/, /Time/, /Confirm/]) {
      expect(screen.getByRole("button", { name: later })).toBeDisabled();
    }
  });

  it("walks customer -> service -> staff -> time -> confirm and books exactly the chosen slot", async () => {
    let booked: unknown;
    fakeBackend((body) => (booked = body));
    const user = userEvent.setup();
    renderWizard();

    await user.type(screen.getByLabelText("Search by name or phone"), "Meera");
    await user.click(await screen.findByRole("button", { name: /Meera Shah/ }));

    await user.click(await screen.findByRole("button", { name: /Haircut/ }));
    await user.click(await screen.findByRole("button", { name: /Asha Stylist/ }));

    // Pick the SECOND slot, to prove we book what was clicked, not just the first one.
    await user.click(await screen.findByRole("button", { name: formatTime(slots[1]!.start) }));
    await user.click(screen.getByRole("button", { name: "Next" }));

    // The summary page repeats the choices back before anything is saved.
    expect(await screen.findByText(/Meera Shah/)).toBeInTheDocument();
    expect(screen.getByText(/Haircut \(30 min/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Confirm booking" }));

    expect(await screen.findByText("Today's Board")).toBeInTheDocument();
    expect(booked).toEqual({
      customerId: 7,
      staffId: 3,
      serviceId: 2,
      startTime: slots[1]!.start,
      endTime: slots[1]!.end,
    });
  });

  it("tells the user when the slot was taken, and does not leave the wizard", async () => {
    fakeBackend(() => {});
    server.use(
      http.post(`${API}/appointments`, () =>
        HttpResponse.json(
          { code: "SLOT_UNAVAILABLE", message: "This time slot is no longer available - please pick another." },
          { status: 409 },
        ),
      ),
    );
    const user = userEvent.setup();
    renderWizard();

    await user.type(screen.getByLabelText("Search by name or phone"), "Meera");
    await user.click(await screen.findByRole("button", { name: /Meera Shah/ }));
    await user.click(await screen.findByRole("button", { name: /Haircut/ }));
    await user.click(await screen.findByRole("button", { name: /Asha Stylist/ }));
    await user.click(await screen.findByRole("button", { name: formatTime(slots[0]!.start) }));
    await user.click(screen.getByRole("button", { name: "Next" }));
    await user.click(await screen.findByRole("button", { name: "Confirm booking" }));

    expect(await screen.findByText(/no longer be available|may have just been taken/i)).toBeInTheDocument();
    expect(screen.queryByText("Today's Board")).not.toBeInTheDocument();
  });
});
