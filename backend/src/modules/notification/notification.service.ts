import { formatTime24h } from "../whatsapp/bot-text.js";
import { formatShortDate } from "../../utils/format-date.js";
import type { WhatsappClient } from "../whatsapp/whatsapp.client.js";
import type {
  NotificationRepository,
  NotificationWithAppointment,
} from "./notification.repository.js";

/** How far ahead of an appointment its reminder gets queued. */
const REMINDER_WINDOW_HOURS = 2;

/**
 * Turns queued NotificationLog rows into actual WhatsApp messages. Deliberately
 * has no idea *why* a notification is pending (booked just now vs. starting
 * soon) - that decision already happened wherever the row was created
 * (AppointmentService.book for confirmations, scheduleUpcomingReminders below
 * for reminders). This just sends whatever's due.
 */
export class NotificationService {
  constructor(
    private readonly notificationRepo: NotificationRepository,
    private readonly whatsappClient: WhatsappClient,
  ) {}

  /** Queues a REMINDER for any BOOKED/CONFIRMED appointment starting soon that doesn't have one yet. */
  async scheduleUpcomingReminders(): Promise<void> {
    const now = new Date();
    const windowEnd = new Date(now.getTime() + REMINDER_WINDOW_HOURS * 60 * 60 * 1000);

    const appointments = await this.notificationRepo.findAppointmentsNeedingReminder(
      now,
      windowEnd,
    );
    for (const appointment of appointments) {
      await this.notificationRepo.create({ appointmentId: appointment.id, type: "REMINDER" });
    }
  }

  /**
   * Fallback path: sends every notification still PENDING. Runs on the 60s poll
   * tick, so under normal conditions it finds nothing - the pub/sub subscriber
   * (sendById) already got there first. This is what catches anything the
   * subscriber missed (e.g. it wasn't running when the row was published).
   */
  async sendPending(): Promise<void> {
    const pending = await this.notificationRepo.findPending();
    for (const notification of pending) {
      await this.sendOne(notification);
    }
  }

  /**
   * Fast path: called by the pub/sub subscriber the instant a notification is
   * published. Re-checks the row is still PENDING first - if sendPending's poll
   * already claimed it (or it's since been sent by an earlier publish), this is
   * a no-op instead of a duplicate WhatsApp message. Single-process, low-volume
   * app: this optimistic check is enough, no distributed lock needed.
   */
  async sendById(id: number): Promise<void> {
    const notification = await this.notificationRepo.findById(id);
    if (!notification || notification.status !== "PENDING") {
      return;
    }
    await this.sendOne(notification);
  }

  private async sendOne(notification: NotificationWithAppointment): Promise<void> {
    try {
      await this.whatsappClient.sendTextMessage(
        notification.appointment.customer.phone,
        this.buildMessage(notification),
      );
      await this.notificationRepo.markSent(notification.id);
    } catch (err) {
      console.error(`Failed to send ${notification.type} notification ${notification.id}:`, err);
      await this.notificationRepo.markFailed(notification.id);
    }
  }

  private buildMessage(notification: NotificationWithAppointment): string {
    const { appointment } = notification;
    const when = `${formatShortDate(appointment.startTime)} at ${formatTime24h(appointment.startTime)}`;

    if (notification.type === "CONFIRMATION") {
      return `Hi ${appointment.customer.name}, your ${appointment.service.name} with ${appointment.staff.name} is confirmed for ${when}. See you then!`;
    }
    return `Reminder: your ${appointment.service.name} with ${appointment.staff.name} is coming up on ${when}. See you soon!`;
  }
}
