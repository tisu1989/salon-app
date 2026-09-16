import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { authorize } from "../../middleware/authorize.js";
import { validateQuery } from "../../middleware/validate.js";
import { asyncHandler } from "../../utils/async-handler.js";
import type { NotificationController } from "./notification.controller.js";
import { listNotificationsQuerySchema } from "./notification.dto.js";

export function createNotificationRouter(controller: NotificationController): Router {
  const router = Router();

  router.use(authenticate);

  router.get("/", validateQuery(listNotificationsQuerySchema), asyncHandler(controller.list));
  router.post("/:id/retry", authorize("ADMIN"), asyncHandler(controller.retry));

  return router;
}
