import {
  Prisma,
  type Appointment,
  type NotificationStatus,
  type NotificationType,
  type PrismaClient,
} from "@prisma/client";
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

// Deliberately a `select`, not the `include: { staff: true }` above - this shape reaches
// the HTTP response (GET /notifications), so staff.passwordHash must never be in it.
const notificationForListingInclude = {
  appointment: {
    include: {
      customer: true,
      service: true,
      staff: { select: { id: true, name: true, phone: true, email: true, role: true } },
    },
  },
} satisfies Prisma.NotificationLogInclude;

/** A notification row shaped for the notification log screen - no password hash along for the ride. */
export type NotificationForListing = Prisma.NotificationLogGetPayload<{
  include: typeof notificationForListingInclude;
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

  /** The notification log screen: most recent first, optionally narrowed to one status. */
  async findRecent(limit: number, status?: NotificationStatus): Promise<NotificationForListing[]> {
    return this.db.notificationLog.findMany({
      ...(status !== undefined && { where: { status } }),
      orderBy: { createdAt: "desc" },
      take: limit,
      include: notificationForListingInclude,
    });
  }

  /**
   * Puts a FAILED notification back in the send queue with a clean slate - a fresh
   * attempt budget and no backoff wait, so the next poll tick (or an immediate
   * publish) picks it up right away instead of waiting out the old schedule.
   */
  async resetForRetry(id: number): Promise<void> {
    await this.db.notificationLog.update({
      where: { id },
      data: { status: "PENDING", attempts: 0, lastAttemptAt: null },
    });
    await this.redis.publish(NOTIFICATION_CHANNEL, JSON.stringify({ id }));
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

  /**
   * Records a failed send attempt. `giveUp` (the caller's call, based on the
   * retry policy) decides whether this stays PENDING for another try later or
   * moves to the terminal FAILED status.
   */
  async recordFailedAttempt(id: number, attempts: number, giveUp: boolean): Promise<void> {
    await this.db.notificationLog.update({
      where: { id },
      data: { attempts, lastAttemptAt: new Date(), status: giveUp ? "FAILED" : "PENDING" },
    });
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
