import type { Request, Response } from "express";
import { env } from "../../config/env.js";
import {
  extractIncomingTextMessages,
  webhookPayloadSchema,
  webhookVerifyQuerySchema,
} from "./whatsapp.dto.js";
import { isValidWebhookSignature } from "./signature.js";
import type { WhatsappService } from "./whatsapp.service.js";

export class WhatsappController {
  constructor(private readonly whatsappService: WhatsappService) {}

  /** Meta's one-time webhook subscription handshake (GET /webhook). */
  verifyWebhook = (req: Request, res: Response): void => {
    const result = webhookVerifyQuerySchema.safeParse(req.query);
    if (!result.success) {
      res.status(400).send();
      return;
    }

    const { "hub.mode": mode, "hub.verify_token": token, "hub.challenge": challenge } = result.data;
    if (mode === "subscribe" && token === env.WHATSAPP_VERIFY_TOKEN) {
      res.status(200).type("text/plain").send(challenge);
      return;
    }

    res.status(403).send();
  };

  /** Inbound messages (POST /webhook). */
  receiveWebhook = (req: Request, res: Response): void => {
    const signatureHeader = req.headers["x-hub-signature-256"];
    const signature = typeof signatureHeader === "string" ? signatureHeader : undefined;

    if (!isValidWebhookSignature(req.rawBody ?? Buffer.alloc(0), signature)) {
      res.status(401).send();
      return;
    }

    const parsed = webhookPayloadSchema.safeParse(req.body);
    if (!parsed.success) {
      req.log?.warn({ issues: parsed.error.issues }, "Ignoring malformed WhatsApp webhook payload");
      res.status(200).send();
      return;
    }

    // Ack Meta immediately - message handling (DB writes, outbound Cloud API calls)
    // shouldn't block the webhook response or risk a duplicate-delivery retry.
    res.status(200).send();

    for (const message of extractIncomingTextMessages(parsed.data)) {
      this.whatsappService.handleIncomingMessage(message).catch((err: unknown) => {
        req.log?.error({ err, from: message.from }, "Failed to handle WhatsApp message");
      });
    }
  };
}
