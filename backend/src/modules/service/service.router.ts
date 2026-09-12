import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { authorize } from "../../middleware/authorize.js";
import { validateBody } from "../../middleware/validate.js";
import { asyncHandler } from "../../utils/async-handler.js";
import type { ServiceController } from "./service.controller.js";
import { createServiceSchema, updateServiceSchema } from "./service.dto.js";

export function createServiceRouter(controller: ServiceController): Router {
  const router = Router();

  router.use(authenticate);
  router.get("/", asyncHandler(controller.listActive));

  router.post(
    "/",
    authorize("ADMIN"),
    validateBody(createServiceSchema),
    asyncHandler(controller.create),
  );
  router.patch(
    "/:id",
    authorize("ADMIN"),
    validateBody(updateServiceSchema),
    asyncHandler(controller.update),
  );
  router.patch("/:id/deactivate", authorize("ADMIN"), asyncHandler(controller.deactivate));

  return router;
}
