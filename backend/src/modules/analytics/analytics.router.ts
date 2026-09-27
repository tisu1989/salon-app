import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { authorize } from "../../middleware/authorize.js";
import { validateQuery } from "../../middleware/validate.js";
import { asyncHandler } from "../../utils/async-handler.js";
import type { AnalyticsController } from "./analytics.controller.js";
import { analyticsSummaryQuerySchema } from "./analytics.dto.js";

export function createAnalyticsRouter(controller: AnalyticsController): Router {
  const router = Router();

  // Business-wide numbers, not any one staff member's business - admin only, same as
  // staff/service management.
  router.use(authenticate, authorize("ADMIN"));

  router.get(
    "/summary",
    validateQuery(analyticsSummaryQuerySchema),
    asyncHandler(controller.getSummary),
  );

  return router;
}
