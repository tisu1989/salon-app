import { describe, expect, it } from "vitest";
import { extractIncomingMessages, webhookPayloadSchema } from "./whatsapp.dto.js";

function payloadWithMessage(message: Record<string, unknown>, contactName = "Ravi") {
  return webhookPayloadSchema.parse({
    object: "whatsapp_business_account",
    entry: [
      {
        changes: [
          {
            field: "messages",
            value: {
              contacts: [{ profile: { name: contactName } }],
              messages: [{ from: "919999999999", ...message }],
            },
          },
        ],
      },
    ],
  });
}

describe("extractIncomingMessages", () => {
  it("extracts a typed text message", () => {
    const payload = payloadWithMessage({ type: "text", text: { body: "hi" } });
    expect(extractIncomingMessages(payload)).toEqual([
      { from: "919999999999", contactName: "Ravi", body: "hi" },
    ]);
  });

  it("extracts a tapped list row as the row's id", () => {
    const payload = payloadWithMessage({
      type: "interactive",
      interactive: { type: "list_reply", list_reply: { id: "2", title: "Manicure" } },
    });
    expect(extractIncomingMessages(payload)).toEqual([
      { from: "919999999999", contactName: "Ravi", body: "2" },
    ]);
  });

  it("extracts a tapped reply button as the button's id", () => {
    const payload = payloadWithMessage({
      type: "interactive",
      interactive: { type: "button_reply", button_reply: { id: "confirm", title: "Confirm" } },
    });
    expect(extractIncomingMessages(payload)).toEqual([
      { from: "919999999999", contactName: "Ravi", body: "confirm" },
    ]);
  });

  it("ignores message types it doesn't understand (e.g. an image)", () => {
    const payload = payloadWithMessage({ type: "image", image: { id: "abc123" } });
    expect(extractIncomingMessages(payload)).toEqual([]);
  });

  it("ignores a 'field' other than messages (e.g. a status update)", () => {
    const payload = webhookPayloadSchema.parse({
      object: "whatsapp_business_account",
      entry: [{ changes: [{ field: "message_status", value: {} }] }],
    });
    expect(extractIncomingMessages(payload)).toEqual([]);
  });
});
