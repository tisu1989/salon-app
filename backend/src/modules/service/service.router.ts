import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { asyncHandler } from "../../utils/async-handler.js";
import type { ServiceController } from "./service.controller.js";

export function createServiceRouter(controller: ServiceController): Router {
  const router = Router();

  router.use(authenticate);
  router.get("/", asyncHandler(controller.listActive));

  return router;
}
