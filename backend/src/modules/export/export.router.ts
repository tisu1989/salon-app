import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { authorize } from "../../middleware/authorize.js";
import { validateBody, validateQuery } from "../../middleware/validate.js";
import { asyncHandler } from "../../utils/async-handler.js";
import type { ExportController } from "./export.controller.js";
import { listExportsQuerySchema, requestExportSchema } from "./export.dto.js";

export function createExportRouter(controller: ExportController): Router {
  const router = Router();

  // Business-wide reporting, same as analytics - admin only.
  router.use(authenticate, authorize("ADMIN"));

  router.get("/", validateQuery(listExportsQuerySchema), asyncHandler(controller.list));
  router.post("/", validateBody(requestExportSchema), asyncHandler(controller.request));
  router.get("/:id/download", asyncHandler(controller.download));

  return router;
}
