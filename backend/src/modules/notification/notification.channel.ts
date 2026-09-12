/** Redis Pub/Sub channel a new NotificationLog row's id is published on, for instant delivery. */
export const NOTIFICATION_CHANNEL = "notifications:new";

export interface NotificationPublishedMessage {
  id: number;
}
