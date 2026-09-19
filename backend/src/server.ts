import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { prisma } from "./config/prisma.js";
import { redis } from "./config/redis.js";
import { services } from "./container.js";
import { startNotificationWorker } from "./jobs/notification-worker.js";
import { startNotificationSubscriber } from "./jobs/notification-subscriber.js";

const app = createApp();

const server = app.listen(env.PORT, () => {
  console.log(`API listening on port ${env.PORT} [${env.NODE_ENV}]`);
});

// Only the real server process runs these - not test runs, which build the app
// via createApp() directly and never import this file.
// Fast path: instant delivery the moment a notification is published.
const subscriber = startNotificationSubscriber(redis, services.notification);
// Safety net: catches anything the subscriber missed, and discovers/queues reminders.
const worker = startNotificationWorker(services.notification);

const SHUTDOWN_TIMEOUT_MS = 10_000;
let shuttingDown = false;

/**
 * Hosts stop the old process with SIGTERM on every redeploy. Wind down in dependency
 * order - stop taking new work, then stop the background jobs, then close the
 * connections they were using - so an in-flight request or WhatsApp send isn't cut off
 * by its own database connection disappearing.
 */
async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`${signal} received - shutting down gracefully`);

  // If something hangs (a stuck request, an unreachable database), exit anyway rather
  // than making the host wait and then SIGKILL us mid-write.
  const forceExit = setTimeout(() => {
    console.error("Graceful shutdown timed out - forcing exit");
    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS);
  forceExit.unref();

  try {
    await new Promise<void>((resolve, reject) =>
      server.close((err) => (err ? reject(err) : resolve())),
    );
    worker.stop();
    await subscriber.stop();
    await redis.quit();
    await prisma.$disconnect();
    process.exit(0);
  } catch (err) {
    console.error("Error during shutdown:", err);
    process.exit(1);
  }
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
