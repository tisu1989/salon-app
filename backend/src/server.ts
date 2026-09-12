import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { services } from "./container.js";
import { startNotificationWorker } from "./jobs/notification-worker.js";

const app = createApp();

app.listen(env.PORT, () => {
  console.log(`API listening on port ${env.PORT} [${env.NODE_ENV}]`);
});

// Only the real server process runs the background worker - not test runs,
// which build the app via createApp() directly and never import this file.
startNotificationWorker(services.notification);
