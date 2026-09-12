import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { validateBody, validateQuery } from "../../middleware/validate.js";
import { asyncHandler } from "../../utils/async-handler.js";
import type { AppointmentController } from "./appointment.controller.js";
import {
  availabilityQuerySchema,
  createAppointmentSchema,
  listAppointmentsQuerySchema,
} from "./appointment.dto.js";

export function createAppointmentRouter(controller: AppointmentController): Router {
  const router = Router();

  // All appointment endpoints require a logged-in staff member (STAFF or ADMIN).
  router.use(authenticate);

  router.get(
    "/availability",
    validateQuery(availabilityQuerySchema),
    asyncHandler(controller.getAvailability),
  );

  router.get("/", validateQuery(listAppointmentsQuerySchema), asyncHandler(controller.listForDay));

  router.post("/", validateBody(createAppointmentSchema), asyncHandler(controller.book));

  router.patch("/:id/cancel", asyncHandler(controller.cancel));

  return router;
}
