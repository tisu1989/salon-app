import { Prisma, type Appointment, type NotificationType, type PrismaClient } from "@prisma/client";
import type { Redis } from "ioredis";
import { NOTIFICATION_CHANNEL } from "./notification.channel.js";

export interface CreateNotificationInput {
  appointmentId: number;
  type: NotificationType;
}

const notificationWithAppointmentInclude = {
  appointment: {
    include: { customer: true, service: true, staff: true },
  },
} satisfies Prisma.NotificationLogInclude;

/** A pending notification row plus everything needed to build and send the actual message. */
export type NotificationWithAppointment = Prisma.NotificationLogGetPayload<{
  include: typeof notificationWithAppointmentInclude;
}>;

export class NotificationRepository {
  constructor(
    private readonly db: PrismaClient,
    private readonly redis: Redis,
  ) {}

  /**
   * Writes the row (the durable source of truth - this is what the poll fallback
   * reads) and publishes its id for instant delivery. Publish is fire-and-forget:
   * if nothing's subscribed right now, the 60s poll worker still picks this row
   * up later, so a missed publish is a latency blip, not a lost notification.
   */
  async create(input: CreateNotificationInput): Promise<void> {
    const notification = await this.db.notificationLog.create({ data: input });
    await this.redis.publish(NOTIFICATION_CHANNEL, JSON.stringify({ id: notification.id }));
  }

  async findById(id: number): Promise<NotificationWithAppointment | null> {
    return this.db.notificationLog.findUnique({
      where: { id },
      include: notificationWithAppointmentInclude,
    });
  }

  /**
   * Notifications still waiting to be sent. Excludes ones whose appointment was
   * cancelled/no-showed after being queued - there's no "moot" status in the
   * enum, so these are simply left PENDING forever rather than mislabeled FAILED.
   */
  async findPending(limit = 50): Promise<NotificationWithAppointment[]> {
    return this.db.notificationLog.findMany({
      where: {
        status: "PENDING",
        appointment: { status: { notIn: ["CANCELLED", "NO_SHOW"] } },
      },
      orderBy: { createdAt: "asc" },
      take: limit,
      include: notificationWithAppointmentInclude,
    });
  }

  async markSent(id: number): Promise<void> {
    await this.db.notificationLog.update({
      where: { id },
      data: { status: "SENT", sentAt: new Date() },
    });
  }

  async markFailed(id: number): Promise<void> {
    await this.db.notificationLog.update({ where: { id }, data: { status: "FAILED" } });
  }

  /** BOOKED/CONFIRMED appointments starting within the window that don't have a REMINDER queued yet. */
  async findAppointmentsNeedingReminder(
    windowStart: Date,
    windowEnd: Date,
  ): Promise<Appointment[]> {
    return this.db.appointment.findMany({
      where: {
        startTime: { gte: windowStart, lte: windowEnd },
        status: { in: ["BOOKED", "CONFIRMED"] },
        notifications: { none: { type: "REMINDER" } },
      },
    });
  }
}
