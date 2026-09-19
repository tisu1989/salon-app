import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterAll, afterEach, beforeAll } from "vitest";
import { server } from "./server";

// "error" makes any request a test forgot to fake fail loudly, instead of silently hitting the network.
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));

afterEach(() => {
  cleanup(); // unmount whatever the test rendered
  server.resetHandlers(); // one test's fake answers must not leak into the next
  localStorage.clear(); // the auth slice persists the refresh token there
});

afterAll(() => server.close());
