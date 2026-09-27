import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { API, server } from "../../test/server";
import { renderWithProviders } from "../../test/render";
import { DashboardPage } from "./DashboardPage";

const summary = {
  range: { days: 7, from: "2026-09-21", to: "2026-09-27" },
  bookingsByDay: [
    { date: "2026-09-21", count: 2 },
    { date: "2026-09-22", count: 0 },
    { date: "2026-09-23", count: 3 },
    { date: "2026-09-24", count: 1 },
    { date: "2026-09-25", count: 0 },
    { date: "2026-09-26", count: 4 },
    { date: "2026-09-27", count: 2 },
  ],
  statusBreakdown: { BOOKED: 3, CONFIRMED: 2, CANCELLED: 1, COMPLETED: 5, NO_SHOW: 1 },
  noShowRate: 1 / 6,
  busiestHours: Array.from({ length: 24 }, (_, hour) => ({
    hour,
    count: hour === 9 ? 5 : 0,
  })),
};

describe("DashboardPage", () => {
  it("shows the total appointment count, no-show percentage, and cancelled count", async () => {
    server.use(http.get(`${API}/analytics/summary`, () => HttpResponse.json(summary)));
    renderWithProviders(<DashboardPage />);

    // Total = sum of every status in the breakdown: 3+2+1+5+1 = 12.
    expect(await screen.findByText("12")).toBeInTheDocument();
    expect(screen.getByText("17%")).toBeInTheDocument(); // round(1/6 * 100)
    // Cancelled tile and a day-of-month x-axis label can both read "1" - scope to the tile.
    expect(screen.getByText("Cancelled").nextSibling).toHaveTextContent("1");
  });

  it("re-fetches with the newly selected range when the dropdown changes", async () => {
    let requestedDays: string | null = null;
    server.use(
      http.get(`${API}/analytics/summary`, ({ request }) => {
        requestedDays = new URL(request.url).searchParams.get("days");
        return HttpResponse.json(summary);
      }),
    );
    const user = userEvent.setup();
    renderWithProviders(<DashboardPage />);
    await screen.findByText("12");
    expect(requestedDays).toBe("7");

    await user.selectOptions(screen.getByLabelText("Range"), "14");

    await screen.findByText("12"); // same fixture data, just re-requested with the new range
    expect(requestedDays).toBe("14");
  });

  it("shows a message instead of a chart when a range has no bookings at all", async () => {
    server.use(
      http.get(`${API}/analytics/summary`, () =>
        HttpResponse.json({
          ...summary,
          bookingsByDay: summary.bookingsByDay.map((d) => ({ ...d, count: 0 })),
        }),
      ),
    );
    renderWithProviders(<DashboardPage />);

    // Only the "bookings per day" chart is empty here - "busiest hours" still has data.
    expect(await screen.findAllByText("No data for this range yet.")).toHaveLength(1);
  });
});
