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

export interface IncomingTextMessage {
  from: string;
  /** The sender's WhatsApp display name, if Meta included contact info for this message. */
  contactName: string | undefined;
  body: string;
}

/** Flattens the deeply-nested webhook payload down to the text messages we can actually act on. */
export function extractIncomingTextMessages(payload: WebhookPayloadDto): IncomingTextMessage[] {
  const messages: IncomingTextMessage[] = [];

  for (const entry of payload.entry) {
    for (const change of entry.changes) {
      if (change.field !== "messages") {
        continue;
      }
      const contactName = change.value.contacts?.[0]?.profile.name;
      for (const message of change.value.messages ?? []) {
        if (message.type === "text" && message.text) {
          messages.push({ from: message.from, contactName, body: message.text.body });
        }
      }
    }
  }

  return messages;
}
