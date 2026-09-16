export type NotificationStatus = "PENDING" | "SENT" | "FAILED";
export type NotificationType = "CONFIRMATION" | "REMINDER";

export interface NotificationLogEntry {
  id: number;
  appointmentId: number;
  type: NotificationType;
  status: NotificationStatus;
  attempts: number;
  lastAttemptAt: string | null;
  sentAt: string | null;
  createdAt: string;
  appointment: {
    id: number;
    customer: { id: number; name: string; phone: string };
    service: { id: number; name: string };
    staff: { id: number; name: string };
  };
}
