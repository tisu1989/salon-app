import { Redis } from "ioredis";
import { env } from "./env.js";

// One shared connection for the whole app - never instantiate a client
// anywhere else. Used for refresh-token storage/revocation today; the
// WhatsApp bot session state will live here too.
//
// lazyConnect defers the actual TCP connection until the first command
// (e.g. login/refresh), so simply importing this module - as every test
// that pulls in the container does - can't fail just because Redis isn't
// running yet.
export const redis = new Redis(env.REDIS_URL, { lazyConnect: true });

// ioredis throws an uncaught error if a connection-level "error" event has no
// listener at all. Log instead of crashing the process.
redis.on("error", (err: Error) => {
  console.error("Redis connection error:", err.message);
});
