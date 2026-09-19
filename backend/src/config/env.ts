import "dotenv/config";
import { z } from "zod";

const MIN_PRODUCTION_SECRET_LENGTH = 32;

const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().default(4000),
    DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
    REDIS_URL: z.string().min(1, "REDIS_URL is required"),
    JWT_ACCESS_SECRET: z.string().min(1),
    JWT_REFRESH_SECRET: z.string().min(1),
    JWT_ACCESS_EXPIRES_IN: z.string().default("15m"),
    JWT_REFRESH_EXPIRES_IN: z.string().default("7d"),
    WHATSAPP_VERIFY_TOKEN: z.string().optional(),
    WHATSAPP_APP_SECRET: z.string().optional(),
    WHATSAPP_ACCESS_TOKEN: z.string().optional(),
    WHATSAPP_PHONE_NUMBER_ID: z.string().optional(),
  })
  .superRefine((values, ctx) => {
    // Dev/test keep short placeholder secrets working; production must not run on a guessable HMAC key.
    if (values.NODE_ENV !== "production") return;
    for (const key of ["JWT_ACCESS_SECRET", "JWT_REFRESH_SECRET"] as const) {
      const value = values[key];
      if (value.length < MIN_PRODUCTION_SECRET_LENGTH || value.startsWith("change_me")) {
        ctx.addIssue({
          code: "custom",
          path: [key],
          message: `must be a real secret of at least ${MIN_PRODUCTION_SECRET_LENGTH} characters in production`,
        });
      }
    }
  });

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // Fail fast and loud - never start the server with bad config
  console.error("Invalid environment configuration:");
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
