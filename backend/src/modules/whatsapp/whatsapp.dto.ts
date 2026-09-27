import { z } from "zod";

export const webhookVerifyQuerySchema = z.object({
  "hub.mode": z.string(),
  "hub.verify_token": z.string(),
  "hub.challenge": z.string(),
});
export type WebhookVerifyQueryDto = z.infer<typeof webhookVerifyQuerySchema>;

// The Cloud API payload has many more fields than this - we only declare what we
// read, and leave everything else to pass through untouched (.passthrough()).
const incomingMessageSchema = z
  .object({
    from: z.string(),
    type: z.string(),
    text: z.object({ body: z.string() }).optional(),
    // Present when the customer tapped a list row or a reply button instead of typing.
    interactive: z
      .object({
        type: z.string(),
        button_reply: z.object({ id: z.string() }).passthrough().optional(),
        list_reply: z.object({ id: z.string() }).passthrough().optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();

const webhookChangeSchema = z
  .object({
    field: z.string(),
    value: z
      .object({
        contacts: z
          .array(z.object({ profile: z.object({ name: z.string() }).passthrough() }).passthrough())
          .optional(),
        messages: z.array(incomingMessageSchema).optional(),
      })
      .passthrough(),
  })
  .passthrough();

export const webhookPayloadSchema = z
  .object({
    object: z.string(),
    entry: z.array(z.object({ changes: z.array(webhookChangeSchema) }).passthrough()),
  })
  .passthrough();
export type WebhookPayloadDto = z.infer<typeof webhookPayloadSchema>;

export interface IncomingMessage {
  from: string;
  /** The sender's WhatsApp display name, if Meta included contact info for this message. */
  contactName: string | undefined;
  /**
   * Either what the customer typed, or - for a tapped list row/button - the id we chose when
   * we sent that row/button (see whatsapp.client.ts). The bot's conversation logic treats both
   * the same way, so it doesn't need to know which one happened.
   */
  body: string;
}

/**
 * Flattens the deeply-nested webhook payload down to the messages we can actually act on:
 * typed text, and taps on a list row or reply button. Anything else (images, reactions,
 * status updates) is ignored.
 */
export function extractIncomingMessages(payload: WebhookPayloadDto): IncomingMessage[] {
  const messages: IncomingMessage[] = [];

  for (const entry of payload.entry) {
    for (const change of entry.changes) {
      if (change.field !== "messages") {
        continue;
      }
      const contactName = change.value.contacts?.[0]?.profile.name;
      for (const message of change.value.messages ?? []) {
        if (message.type === "text" && message.text) {
          messages.push({ from: message.from, contactName, body: message.text.body });
        } else if (message.type === "interactive" && message.interactive) {
          const body = message.interactive.button_reply?.id ?? message.interactive.list_reply?.id;
          if (body) {
            messages.push({ from: message.from, contactName, body });
          }
        }
      }
    }
  }

  return messages;
}
