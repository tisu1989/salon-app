import type { NotificationService } from "../modules/notification/notification.service.js";

const POLL_INTERVAL_MS = 60_000; // a small salon's booking volume doesn't need anything finer-grained

export interface NotificationWorkerHandle {
  stop: () => void;
}

/**
 * Starts the background loop that queues upcoming reminders and sends whatever's
 * pending. Deliberately started only from server.ts, NOT from app.ts/container.ts -
 * createApp() is what tests use to build the Express app, and it must never have
 * the side effect of spinning up a background timer that outlives the test.
 */
export function startNotificationWorker(service: NotificationService): NotificationWorkerHandle {
  const tick = (): void => {
    service
      .scheduleUpcomingReminders()
      .then(() => service.sendPending())
      .catch((err: unknown) => console.error("Notification worker tick failed:", err));
  };

  const timer = setInterval(tick, POLL_INTERVAL_MS);
  // Don't let this timer keep the Node process alive on its own (e.g. during shutdown).
  timer.unref();

  return { stop: () => clearInterval(timer) };
}
