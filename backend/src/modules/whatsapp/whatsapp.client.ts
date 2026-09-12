import { env } from "../../config/env.js";

const GRAPH_API_VERSION = "v20.0";

/**
 * Thin wrapper around the WhatsApp Cloud API's "send message" endpoint.
 * WHATSAPP_ACCESS_TOKEN/WHATSAPP_PHONE_NUMBER_ID are optional in env.ts (so the
 * rest of the app can run without a configured WhatsApp app) - sending is a no-op
 * with a warning until they're set, rather than crashing the request that triggered it.
 */
export class WhatsappClient {
  async sendTextMessage(to: string, body: string): Promise<void> {
    if (!env.WHATSAPP_ACCESS_TOKEN || !env.WHATSAPP_PHONE_NUMBER_ID) {
      console.warn("WhatsApp credentials not configured - skipping outbound message:", body);
      return;
    }

    const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { body },
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`WhatsApp send failed (${response.status}): ${errorBody}`);
    }
  }
}
