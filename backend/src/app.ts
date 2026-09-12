import cors from "cors";
import express, { type Express } from "express";
import helmet from "helmet";
import { pinoHttp } from "pino-http";
import { errorHandler } from "./middleware/error-handler.js";

export function createApp(): Express {
  const app = express();

  app.use(helmet());
  app.use(cors()); // tighten to an allow-list once frontend origin is known
  app.use(express.json());
  app.use(pinoHttp());

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  // Feature routes get mounted here as modules are built, e.g.:
  // app.use("/api/v1/auth", authRouter);
  // app.use("/api/v1/appointments", appointmentRouter);

  // Must be registered last
  app.use(errorHandler);

  return app;
}
