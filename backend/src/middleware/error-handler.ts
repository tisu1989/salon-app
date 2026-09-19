import type { NextFunction, Request, Response } from "express";

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;

  constructor(code: string, message: string, statusCode = 400) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
  }
}

// Keep this as the LAST middleware registered in app.ts
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ code: err.code, message: err.message });
    return;
  }

  req.log?.error({ err }, "Unhandled error");

  // Never leak stack traces or raw error messages to the client
  res.status(500).json({ code: "INTERNAL_ERROR", message: "Something went wrong" });
}
