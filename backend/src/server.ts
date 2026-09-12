import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { redis } from "./config/redis.js";
import { services } from "./container.js";
import { startNotificationWorker } from "./jobs/notification-worker.js";
import { startNotificationSubscriber } from "./jobs/notification-subscriber.js";

const app = createApp();

app.listen(env.PORT, () => {
  console.log(`API listening on port ${env.PORT} [${env.NODE_ENV}]`);
});

// Only the real server process runs these - not test runs, which build the app
// via createApp() directly and never import this file.
// Fast path: instant delivery the moment a notification is published.
startNotificationSubscriber(redis, services.notification);
// Safety net: catches anything the subscriber missed, and discovers/queues reminders.
startNotificationWorker(services.notification);
