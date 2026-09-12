import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { validateBody } from "../../middleware/validate.js";
import { asyncHandler } from "../../utils/async-handler.js";
import type { AuthController } from "./auth.controller.js";
import { loginSchema, refreshSchema } from "./auth.dto.js";

export function createAuthRouter(controller: AuthController): Router {
  const router = Router();

  router.post("/login", validateBody(loginSchema), asyncHandler(controller.login));
  router.post("/refresh", validateBody(refreshSchema), asyncHandler(controller.refresh));
  router.post("/logout", authenticate, asyncHandler(controller.logout));

  return router;
}
