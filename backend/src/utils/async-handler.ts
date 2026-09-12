import type { NextFunction, Request, Response } from "express";

type AsyncRequestHandler = (req: Request, res: Response, next: NextFunction) => Promise<unknown>;

/**
 * Express 4 doesn't await route handlers, so a rejected promise inside an
 * `async` handler would otherwise crash the process instead of reaching
 * `errorHandler`. Wrap every async handler with this before registering it.
 */
export function asyncHandler(handler: AsyncRequestHandler) {
  return (req: Request, res: Response, next: NextFunction): void => {
    handler(req, res, next).catch(next);
  };
}
