import type { PrismaClient } from "@prisma/client";
import type { Redis } from "ioredis";

const CHECK_TIMEOUT_MS = 2000;

export interface HealthResult {
  status: "ok" | "degraded";
  checks: {
    database: "ok" | "error";
    redis: "ok" | "error";
  };
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`timed out after ${ms}ms`)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err: unknown) => {
        clearTimeout(timer);
        reject(err instanceof Error ? err : new Error(String(err)));
      },
    );
  });
}

/**
 * Actually verifies the app can reach its dependencies, rather than just
 * confirming the Node process is up - a health check that always returns "ok"
 * would happily keep sending traffic to an instance whose DB connection died.
 * Each check is timed out independently so a hung dependency can't hang the
 * whole health check (and therefore never surface as unhealthy).
 */
export async function checkHealth(db: PrismaClient, redis: Redis): Promise<HealthResult> {
  const [dbResult, redisResult] = await Promise.allSettled([
    withTimeout(db.$queryRaw`SELECT 1`, CHECK_TIMEOUT_MS),
    withTimeout(redis.ping(), CHECK_TIMEOUT_MS),
  ]);

  const checks: HealthResult["checks"] = {
    database: dbResult.status === "fulfilled" ? "ok" : "error",
    redis: redisResult.status === "fulfilled" ? "ok" : "error",
  };

  if (dbResult.status === "rejected") {
    console.error("Health check: database unreachable:", dbResult.reason);
  }
  if (redisResult.status === "rejected") {
    console.error("Health check: redis unreachable:", redisResult.reason);
  }

  const status = checks.database === "ok" && checks.redis === "ok" ? "ok" : "degraded";
  return { status, checks };
}
