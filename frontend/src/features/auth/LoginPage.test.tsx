import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { API, server } from "../../test/server";
import { renderWithProviders } from "../../test/render";
import { LoginPage } from "./LoginPage";

function renderLogin() {
  return renderWithProviders(
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<h1>Today's Board</h1>} />
    </Routes>,
    { route: "/login" },
  );
}

async function fillAndSubmit(identifier: string, password: string) {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("Phone or email"), identifier);
  await user.type(screen.getByLabelText("Password"), password);
  await user.click(screen.getByRole("button", { name: "Sign in" }));
}

describe("LoginPage", () => {
  it("shows the server's error message when the password is wrong, and stays on the page", async () => {
    server.use(
      http.post(`${API}/auth/login`, () =>
        HttpResponse.json(
          { code: "INVALID_CREDENTIALS", message: "Incorrect phone/email or password." },
          { status: 401 },
        ),
      ),
    );
    const { store } = renderLogin();

    await fillAndSubmit("+911", "wrong");

    expect(await screen.findByText("Incorrect phone/email or password.")).toBeInTheDocument();
    expect(screen.queryByText("Today's Board")).not.toBeInTheDocument();
    expect(store.getState().auth.staff).toBeNull();
  });

  it("logs in, stores the session, remembers the refresh token, and lands on the board", async () => {
    let sentBody: unknown;
    server.use(
      http.post(`${API}/auth/login`, async ({ request }) => {
        sentBody = await request.json();
        return HttpResponse.json({
          staff: { id: 1, name: "Priya", role: "ADMIN" },
          accessToken: "access-1",
          refreshToken: "refresh-1",
        });
      }),
    );
    const { store } = renderLogin();

    await fillAndSubmit("+910000000001", "DevPassword123!");

    expect(await screen.findByText("Today's Board")).toBeInTheDocument();
    // What the browser actually sent - the contract with the backend:
    expect(sentBody).toEqual({ identifier: "+910000000001", password: "DevPassword123!" });
    expect(store.getState().auth.staff).toEqual({ id: 1, name: "Priya", role: "ADMIN" });
    expect(localStorage.getItem("salon.refreshToken")).toBe("refresh-1");
  });

  it("disables the button while the request is in flight, so a double-click can't send twice", async () => {
    server.use(
      http.post(`${API}/auth/login`, async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
        return HttpResponse.json({ staff: { id: 1, name: "P", role: "STAFF" }, accessToken: "a", refreshToken: "r" });
      }),
    );
    renderLogin();

    await fillAndSubmit("+911", "pw");

    expect(screen.getByRole("button", { name: "Signing in…" })).toBeDisabled();
    expect(await screen.findByText("Today's Board")).toBeInTheDocument();
  });
});
