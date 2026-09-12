import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { validateBody, validateQuery } from "../../middleware/validate.js";
import { asyncHandler } from "../../utils/async-handler.js";
import type { CustomerController } from "./customer.controller.js";
import { createCustomerSchema, searchCustomerQuerySchema } from "./customer.dto.js";

export function createCustomerRouter(controller: CustomerController): Router {
  const router = Router();

  router.use(authenticate);

  router.get("/", validateQuery(searchCustomerQuerySchema), asyncHandler(controller.search));
  router.get("/:id", asyncHandler(controller.getById));
  router.post("/", validateBody(createCustomerSchema), asyncHandler(controller.create));

  return router;
}
