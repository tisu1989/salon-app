import { env } from "../../config/env.js";

const GRAPH_API_VERSION = "v20.0";

export interface ListRow {
  id: string;
  title: string;
  description?: string;
}

export interface ButtonOption {
  id: string;
  title: string;
}

/**
 * Thin wrapper around the WhatsApp Cloud API's "send message" endpoint.
 * WHATSAPP_ACCESS_TOKEN/WHATSAPP_PHONE_NUMBER_ID are optional in env.ts (so the
 * rest of the app can run without a configured WhatsApp app) - sending is a no-op
 * with a warning until they're set, rather than crashing the request that triggered it.
 */
export class WhatsappClient {
  async sendTextMessage(to: string, body: string): Promise<void> {
    await this.post(to, {
      type: "text",
      text: { body },
    });
  }

  /** A single tappable button that opens a scrollable list of up to 10 rows. */
  async sendListMessage(
    to: string,
    params: { bodyText: string; buttonLabel: string; rows: ListRow[] },
  ): Promise<void> {
    await this.post(to, {
      type: "interactive",
      interactive: {
        type: "list",
        body: { text: params.bodyText },
        action: {
          button: params.buttonLabel,
          sections: [{ rows: params.rows }],
        },
      },
    });
  }

  /** Up to 3 tappable reply buttons shown directly in the chat. */
  async sendButtonsMessage(
    to: string,
    params: { bodyText: string; buttons: ButtonOption[] },
  ): Promise<void> {
    await this.post(to, {
      type: "interactive",
      interactive: {
        type: "button",
        body: { text: params.bodyText },
        action: {
          buttons: params.buttons.map((b) => ({ type: "reply", reply: b })),
        },
      },
    });
  }

  private async post(to: string, message: Record<string, unknown>): Promise<void> {
    if (!env.WHATSAPP_ACCESS_TOKEN || !env.WHATSAPP_PHONE_NUMBER_ID) {
      console.warn("WhatsApp credentials not configured - skipping outbound message:", message);
      return;
    }

    const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ messaging_product: "whatsapp", to, ...message }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`WhatsApp send failed (${response.status}): ${errorBody}`);
    }
  }
}
