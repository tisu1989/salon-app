import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { validateBody } from "../../middleware/validate.js";
import { asyncHandler } from "../../utils/async-handler.js";
import type { ChatController } from "./chat.controller.js";
import { chatRequestSchema } from "./chat.dto.js";

export function createChatRouter(controller: ChatController): Router {
  const router = Router();

  router.use(authenticate);
  router.post("/", validateBody(chatRequestSchema), asyncHandler(controller.sendMessage));

  return router;
}
