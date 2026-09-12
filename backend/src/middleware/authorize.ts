import type { Role } from "@prisma/client";
import type { NextFunction, Request, Response } from "express";
import { AppError } from "./error-handler.js";

/**
 * Restricts a route to one or more roles. Must run after `authenticate`.
 * Usage: router.post("/staff", authenticate, authorize("ADMIN"), handler)
 */
export function authorize(...allowedRoles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      // Programmer error: authorize() used without authenticate() ahead of it.
      next(new AppError("UNAUTHENTICATED", "Not authenticated.", 401));
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      next(new AppError("FORBIDDEN", "You do not have permission to do this.", 403));
      return;
    }

    next();
  };
}
