import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { authorize } from "../../middleware/authorize.js";
import { validateBody } from "../../middleware/validate.js";
import { asyncHandler } from "../../utils/async-handler.js";
import type { StaffController } from "./staff.controller.js";
import {
  createStaffSchema,
  createTimeOffSchema,
  resetPasswordSchema,
  setWorkingHoursSchema,
  updateStaffSchema,
} from "./staff.dto.js";

export function createStaffRouter(controller: StaffController): Router {
  const router = Router();

  router.use(authenticate);

  router.get("/", asyncHandler(controller.listActive));

  // Only admins can provision new staff logins.
  router.post(
    "/",
    authorize("ADMIN"),
    validateBody(createStaffSchema),
    asyncHandler(controller.create),
  );

  router.patch(
    "/:id",
    authorize("ADMIN"),
    validateBody(updateStaffSchema),
    asyncHandler(controller.update),
  );
  router.patch("/:id/deactivate", authorize("ADMIN"), asyncHandler(controller.deactivate));
  router.patch(
    "/:id/reset-password",
    authorize("ADMIN"),
    validateBody(resetPasswordSchema),
    asyncHandler(controller.resetPassword),
  );

  // Anyone signed in can view a schedule (needed to show availability), but only
  // admins can change it - schedule changes affect what customers can book.
  router.get("/:id/working-hours", asyncHandler(controller.getWorkingHours));
  router.put(
    "/:id/working-hours",
    authorize("ADMIN"),
    validateBody(setWorkingHoursSchema),
    asyncHandler(controller.setWorkingHours),
  );

  router.get("/:id/time-off", asyncHandler(controller.listTimeOff));
  router.post(
    "/:id/time-off",
    authorize("ADMIN"),
    validateBody(createTimeOffSchema),
    asyncHandler(controller.createTimeOff),
  );
  router.delete(
    "/:id/time-off/:timeOffId",
    authorize("ADMIN"),
    asyncHandler(controller.deleteTimeOff),
  );

  return router;
}
