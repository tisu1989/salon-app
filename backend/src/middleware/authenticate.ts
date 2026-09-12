import type { NextFunction, Request, Response } from "express";
import { AppError } from "./error-handler.js";
import { verifyAccessToken } from "../modules/auth/jwt.js";

/** Requires a valid `Authorization: Bearer <accessToken>` header; populates `req.user`. */
export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  const [scheme, token] = header?.split(" ") ?? [];

  if (scheme !== "Bearer" || !token) {
    next(new AppError("UNAUTHENTICATED", "Missing or malformed Authorization header.", 401));
    return;
  }

  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, role: payload.role };
    next();
  } catch {
    next(new AppError("UNAUTHENTICATED", "Access token is invalid or expired.", 401));
  }
}
