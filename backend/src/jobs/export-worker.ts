import type { ExportService } from "../modules/export/export.service.js";

// Exports are small and should feel snappy to whoever's waiting on one - checking every
// 10s is cheap and keeps the "a few seconds" promise from the UI copy honest.
const POLL_INTERVAL_MS = 10_000;

export interface ExportWorkerHandle {
  stop: () => void;
}

/**
 * Starts the background loop that builds whatever's queued. Same shape as
 * notification-worker.ts, started only from server.ts for the same reason: createApp()
 * is what tests use to build the Express app, and it must never have the side effect of
 * spinning up a background timer that outlives the test.
 */
export function startExportWorker(service: ExportService): ExportWorkerHandle {
  const tick = (): void => {
    service
      .processPending()
      .catch((err: unknown) => console.error("Export worker tick failed:", err));
  };

  const timer = setInterval(tick, POLL_INTERVAL_MS);
  timer.unref();

  return { stop: () => clearInterval(timer) };
}
