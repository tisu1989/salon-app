import { describe, expect, it } from "vitest";
import { buildCorsOptions, resolveAllowedOrigins } from "./cors.js";

describe("resolveAllowedOrigins", () => {
  it("uses an explicit comma-separated list, trimmed", () => {
    expect(resolveAllowedOrigins("https://a.example, https://b.example ", "production")).toEqual([
      "https://a.example",
      "https://b.example",
    ]);
  });

  it("falls back to local Vite origins outside production", () => {
    expect(resolveAllowedOrigins(undefined, "development")).toContain("http://localhost:5183");
  });

  it("allows no browser origin at all in production when nothing is configured", () => {
    expect(resolveAllowedOrigins(undefined, "production")).toEqual([]);
  });
});

describe("buildCorsOptions", () => {
  function decide(allowed: string[], origin: string | undefined): boolean {
    let result: boolean | undefined;
    const { origin: check } = buildCorsOptions(allowed) as {
      origin: (o: string | undefined, cb: (err: Error | null, allow?: boolean) => void) => void;
    };
    check(origin, (_err, allow) => {
      result = allow;
    });
    return result as boolean;
  }

  it("allows listed origins and rejects others", () => {
    expect(decide(["https://app.example"], "https://app.example")).toBe(true);
    expect(decide(["https://app.example"], "https://evil.example")).toBe(false);
  });

  it("does not block requests that carry no Origin header (curl, webhooks)", () => {
    expect(decide([], undefined)).toBe(true);
  });
});
