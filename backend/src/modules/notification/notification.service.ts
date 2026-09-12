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

  /** Sends every pending notification (confirmations queued at booking time, reminders queued above). */
  async sendPending(): Promise<void> {
    const pending = await this.notificationRepo.findPending();

    for (const notification of pending) {
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
