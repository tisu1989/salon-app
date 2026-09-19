import { createHmac } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockEnv: { WHATSAPP_APP_SECRET: string | undefined } = { WHATSAPP_APP_SECRET: undefined };
vi.mock("../../config/env.js", () => ({ env: mockEnv }));

const { isValidWebhookSignature } = await import("./signature.js");

const body = Buffer.from(JSON.stringify({ entry: [] }));

function sign(secret: string, payload: Buffer): string {
  return `sha256=${createHmac("sha256", secret).update(payload).digest("hex")}`;
}

describe("isValidWebhookSignature", () => {
  beforeEach(() => {
    mockEnv.WHATSAPP_APP_SECRET = undefined;
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  it("rejects everything when no app secret is configured (fails closed)", () => {
    expect(isValidWebhookSignature(body, undefined)).toBe(false);
    expect(isValidWebhookSignature(body, sign("anything", body))).toBe(false);
  });

  it("accepts a correctly signed body", () => {
    mockEnv.WHATSAPP_APP_SECRET = "app-secret";
    expect(isValidWebhookSignature(body, sign("app-secret", body))).toBe(true);
  });

  it("rejects a signature made with the wrong secret, a tampered body, or a missing header", () => {
    mockEnv.WHATSAPP_APP_SECRET = "app-secret";
    expect(isValidWebhookSignature(body, sign("other-secret", body))).toBe(false);
    expect(isValidWebhookSignature(Buffer.from("tampered"), sign("app-secret", body))).toBe(false);
    expect(isValidWebhookSignature(body, undefined)).toBe(false);
  });
});
