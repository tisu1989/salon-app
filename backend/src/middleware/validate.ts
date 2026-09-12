import type { NextFunction, Request, Response } from "express";
import type { ZodTypeAny } from "zod";
import { AppError } from "./error-handler.js";

/**
 * Validates `req.body` against `schema` and replaces it with the parsed
 * (and type-coerced) result. Rejects with a 400 on the first failure.
 */
export function validateBody(schema: ZodTypeAny) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      next(
        new AppError(
          "VALIDATION_ERROR",
          result.error.issues.map((i) => `${i.path.join(".") || "body"}: ${i.message}`).join("; "),
          400,
        ),
      );
      return;
    }
    req.body = result.data;
    next();
  };
}

/** Same as `validateBody`, but for `req.query`. */
export function validateQuery(schema: ZodTypeAny) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      next(
        new AppError(
          "VALIDATION_ERROR",
          result.error.issues.map((i) => `${i.path.join(".") || "query"}: ${i.message}`).join("; "),
          400,
        ),
      );
      return;
    }
    // req.query is technically read-only typed; stash the parsed value where handlers expect it.
    (req as Request & { validatedQuery: unknown }).validatedQuery = result.data;
    next();
  };
}

/** Reads back the value `validateQuery` stashed on the request, typed as `T`. */
export function getValidatedQuery<T>(req: Request): T {
  return (req as Request & { validatedQuery: T }).validatedQuery;
}
