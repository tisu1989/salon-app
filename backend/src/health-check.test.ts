import { describe, expect, it } from "vitest";
import type { PrismaClient } from "@prisma/client";
import type { Redis } from "ioredis";
import { checkHealth } from "./health-check.js";

// Minimal fakes satisfying just the two calls checkHealth actually makes -
// exercising the degraded path doesn't need a real DB/Redis to be down.
function fakeDb(queryRaw: () => Promise<unknown>): PrismaClient {
  return { $queryRaw: queryRaw } as unknown as PrismaClient;
}
function fakeRedis(ping: () => Promise<string>): Redis {
  return { ping } as unknown as Redis;
}

describe("checkHealth", () => {
  it("reports ok when both dependencies respond", async () => {
    const result = await checkHealth(
      fakeDb(() => Promise.resolve([{ 1: 1 }])),
      fakeRedis(() => Promise.resolve("PONG")),
    );
    expect(result).toEqual({ status: "ok", checks: { database: "ok", redis: "ok" } });
  });

  it("reports degraded with per-dependency detail when the database is unreachable", async () => {
    const result = await checkHealth(
      fakeDb(() => Promise.reject(new Error("connection refused"))),
      fakeRedis(() => Promise.resolve("PONG")),
    );
    expect(result).toEqual({ status: "degraded", checks: { database: "error", redis: "ok" } });
  });

  it("reports degraded when redis is unreachable", async () => {
    const result = await checkHealth(
      fakeDb(() => Promise.resolve([{ 1: 1 }])),
      fakeRedis(() => Promise.reject(new Error("connection refused"))),
    );
    expect(result).toEqual({ status: "degraded", checks: { database: "ok", redis: "error" } });
  });

  it("treats a hung dependency as unreachable rather than waiting forever", async () => {
    const neverResolves = () => new Promise<unknown>(() => {});
    const result = await checkHealth(
      fakeDb(neverResolves),
      fakeRedis(() => Promise.resolve("PONG")),
    );
    expect(result.checks.database).toBe("error");
  }, 10_000);
});
