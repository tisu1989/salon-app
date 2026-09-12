import type { Redis } from "ioredis";
import {
  NOTIFICATION_CHANNEL,
  type NotificationPublishedMessage,
} from "../modules/notification/notification.channel.js";
import type { NotificationService } from "../modules/notification/notification.service.js";

export interface NotificationSubscriberHandle {
  stop: () => Promise<void>;
}

/**
 * Subscribes to NOTIFICATION_CHANNEL for instant delivery - the fast path that
 * makes confirmations/reminders send within milliseconds instead of waiting for
 * the 60s poll worker. Started only from server.ts, same as the poll worker,
 * so building the app for tests never opens a live Redis subscription.
 *
 * ioredis connections that issue SUBSCRIBE can no longer run normal commands,
 * so this duplicates the shared client rather than reusing it directly.
 */
export function startNotificationSubscriber(
  redis: Redis,
  service: NotificationService,
): NotificationSubscriberHandle {
  const subscriber = redis.duplicate();

  subscriber.on("error", (err: Error) => {
    console.error("Notification subscriber connection error:", err.message);
  });

  subscriber.subscribe(NOTIFICATION_CHANNEL).catch((err: unknown) => {
    console.error("Failed to subscribe to notification channel:", err);
  });

  subscriber.on("message", (_channel, raw) => {
    let message: NotificationPublishedMessage;
    try {
      message = JSON.parse(raw) as NotificationPublishedMessage;
    } catch (err) {
      console.error("Ignoring malformed notification pub/sub message:", err);
      return;
    }

    service.sendById(message.id).catch((err: unknown) => {
      console.error(`Failed to instantly send notification ${message.id}:`, err);
    });
  });

  return {
    stop: async () => {
      await subscriber.unsubscribe(NOTIFICATION_CHANNEL);
      subscriber.disconnect();
    },
  };
}
