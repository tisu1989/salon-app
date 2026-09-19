import cors from "cors";
import express, { type Express } from "express";
import helmet from "helmet";
import { pinoHttp } from "pino-http";
import { env } from "./config/env.js";
import { buildCorsOptions, resolveAllowedOrigins } from "./config/cors.js";
import { errorHandler } from "./middleware/error-handler.js";
import { refreshRateLimit, webhookRateLimit } from "./middleware/rate-limit.js";
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

  // Only set when the API sits behind reverse proxies - otherwise req.ip (used for login
  // lockout and rate limits) would be the proxy for everyone, or spoofable via X-Forwarded-For.
  if (env.TRUST_PROXY !== undefined) {
    app.set("trust proxy", env.TRUST_PROXY);
  }

  app.use(helmet());
  app.use(cors(buildCorsOptions(resolveAllowedOrigins(env.CORS_ORIGINS, env.NODE_ENV))));
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

  app.use("/api/v1/auth/refresh", refreshRateLimit);
  app.use("/api/v1/auth", createAuthRouter(controllers.auth));
  app.use("/api/v1/appointments", createAppointmentRouter(controllers.appointment));
  app.use("/api/v1/staff", createStaffRouter(controllers.staff));
  app.use("/api/v1/services", createServiceRouter(controllers.service));
  app.use("/api/v1/customers", createCustomerRouter(controllers.customer));
  app.use("/api/v1/notifications", createNotificationRouter(controllers.notification));
  app.use("/webhook", webhookRateLimit, createWhatsappRouter(controllers.whatsapp));

  // Must be registered last
  app.use(errorHandler);

  return app;
}
