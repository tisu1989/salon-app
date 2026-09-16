import cors from "cors";
import express, { type Express } from "express";
import helmet from "helmet";
import { pinoHttp } from "pino-http";
import { errorHandler } from "./middleware/error-handler.js";
import { controllers } from "./container.js";
import { prisma } from "./config/prisma.js";
import { redis } from "./config/redis.js";
import { checkHealth } from "./health-check.js";
import { asyncHandler } from "./utils/async-handler.js";
import { createAuthRouter } from "./modules/auth/auth.router.js";
import { createAppointmentRouter } from "./modules/appointment/appointment.router.js";
import { createStaffRouter } from "./modules/staff/staff.router.js";
import { createServiceRouter } from "./modules/service/service.router.js";
import { createCustomerRouter } from "./modules/customer/customer.router.js";
import { createWhatsappRouter } from "./modules/whatsapp/whatsapp.router.js";
import { createNotificationRouter } from "./modules/notification/notification.router.js";

export function createApp(): Express {
  const app = express();

  app.use(helmet());
  app.use(cors()); // tighten to an allow-list once frontend origin is known
  app.use(
    express.json({
      // Stashes the exact bytes received, before JSON parsing - the WhatsApp
      // webhook signature is computed over these raw bytes, not the parsed object.
      verify: (req, _res, buf) => {
        (req as { rawBody?: Buffer }).rawBody = buf;
      },
    }),
  );
  app.use(pinoHttp());

  app.get(
    "/health",
    asyncHandler(async (_req, res) => {
      const result = await checkHealth(prisma, redis);
      res.status(result.status === "ok" ? 200 : 503).json(result);
    }),
  );

  app.use("/api/v1/auth", createAuthRouter(controllers.auth));
  app.use("/api/v1/appointments", createAppointmentRouter(controllers.appointment));
  app.use("/api/v1/staff", createStaffRouter(controllers.staff));
  app.use("/api/v1/services", createServiceRouter(controllers.service));
  app.use("/api/v1/customers", createCustomerRouter(controllers.customer));
  app.use("/api/v1/notifications", createNotificationRouter(controllers.notification));
  app.use("/webhook", createWhatsappRouter(controllers.whatsapp));

  // Must be registered last
  app.use(errorHandler);

  return app;
}
