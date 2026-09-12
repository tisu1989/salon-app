import { Router } from "express";
import type { WhatsappController } from "./whatsapp.controller.js";

/**
 * Deliberately NOT behind `authenticate` - Meta calls this directly, with no
 * bearer token. The webhook subscription handshake is protected by the shared
 * verify token, and inbound messages are protected by the HMAC signature check
 * in `receiveWebhook` instead.
 */
export function createWhatsappRouter(controller: WhatsappController): Router {
  const router = Router();

  router.get("/", controller.verifyWebhook);
  router.post("/", controller.receiveWebhook);

  return router;
}
