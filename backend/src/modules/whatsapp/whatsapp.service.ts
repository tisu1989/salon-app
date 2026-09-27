import { env } from "../../config/env.js";
import { AppError } from "../../middleware/error-handler.js";
import type { CustomerRepository } from "../customer/customer.repository.js";
import type { ServiceRepository } from "../service/service.repository.js";
import type { StaffRepository } from "../staff/staff.repository.js";
import type { AppointmentService } from "../appointment/appointment.service.js";
import {
  formatDateHuman,
  formatTime24h,
  isResetCommand,
  parseRequestedDate,
  resolveNumberedSelection,
  truncateForWhatsapp,
} from "./bot-text.js";
import type { IncomingMessage } from "./whatsapp.dto.js";
import type { ConversationState, SlotOption, WhatsappSessionStore } from "./whatsapp.session.js";
import type { ButtonOption, ListRow, WhatsappClient } from "./whatsapp.client.js";

const MAX_LIST_ROWS = 10; // WhatsApp's hard limit on rows in a single list message

const DATE_BUTTONS: ButtonOption[] = [
  { id: "today", title: "Today" },
  { id: "tomorrow", title: "Tomorrow" },
  { id: "custom", title: "Pick a date" },
];

const CONFIRM_BUTTONS: ButtonOption[] = [
  { id: "confirm", title: "Confirm" },
  { id: "cancel", title: "Cancel" },
];

type BotReply =
  | { kind: "text"; text: string }
  | { kind: "list"; bodyText: string; buttonLabel: string; rows: ListRow[] }
  | { kind: "buttons"; bodyText: string; buttons: ButtonOption[] };

function textReply(text: string): BotReply {
  return { kind: "text", text };
}

function toRow(id: string, title: string, description?: string): ListRow {
  return {
    id,
    title: truncateForWhatsapp(title, 24),
    ...(description && { description: truncateForWhatsapp(description, 72) }),
  };
}

/**
 * Drives the WhatsApp booking conversation: a small step-by-step state machine
 * (service -> staff -> date -> slot -> confirm -> booked) backed by Redis, reusing the
 * exact same AppointmentService the staff panel uses - one source of truth for
 * availability and booking rules everywhere in the app.
 *
 * Customers answer by tapping a WhatsApp list row or reply button. Each row/button we send
 * is given an id that's just the 1-based position of that option ("1", "2", ...), or a fixed
 * word ("today", "confirm"...) - so a tap and a customer typing that same number/word by hand
 * both resolve identically. Typing always still works as a fallback.
 */
export class WhatsappService {
  constructor(
    private readonly sessions: WhatsappSessionStore,
    private readonly client: WhatsappClient,
    private readonly customerRepo: CustomerRepository,
    private readonly serviceRepo: ServiceRepository,
    private readonly staffRepo: StaffRepository,
    private readonly appointmentService: AppointmentService,
  ) {}

  async handleIncomingMessage(message: IncomingMessage): Promise<void> {
    const reply = await this.processMessage(message);
    switch (reply.kind) {
      case "text":
        await this.client.sendTextMessage(message.from, reply.text);
        break;
      case "list":
        await this.client.sendListMessage(message.from, reply);
        break;
      case "buttons":
        await this.client.sendButtonsMessage(message.from, reply);
        break;
    }
  }

  private async processMessage(message: IncomingMessage): Promise<BotReply> {
    const { from, body, contactName } = message;

    if (isResetCommand(body)) {
      await this.sessions.clear(from);
      return this.startBooking(from, contactName);
    }

    const session = await this.sessions.get(from);
    if (!session) {
      return this.startBooking(from, contactName);
    }

    switch (session.step) {
      case "AWAITING_SERVICE":
        return this.handleServiceSelection(from, session, body);
      case "AWAITING_STAFF":
        return this.handleStaffSelection(from, session, body);
      case "AWAITING_DATE":
        return this.handleDateInput(from, session, body);
      case "AWAITING_SLOT":
        return this.handleSlotSelection(from, session, body);
      case "AWAITING_CONFIRM":
        return this.handleConfirm(from, session, body);
    }
  }

  private async startBooking(phone: string, contactName: string | undefined): Promise<BotReply> {
    const customer = await this.customerRepo.findOrCreateByPhone(
      phone,
      contactName ?? "WhatsApp Customer",
    );

    const services = (await this.serviceRepo.findAllActive()).slice(0, MAX_LIST_ROWS);
    if (services.length === 0) {
      return textReply(
        "Sorry, we don't have any bookable services set up right now. Please call the salon directly.",
      );
    }

    await this.sessions.set(phone, {
      step: "AWAITING_SERVICE",
      customerId: customer.id,
      presentedServiceIds: services.map((s) => s.id),
    });

    return {
      kind: "list",
      bodyText: `👋 Welcome to *${env.SALON_NAME}*!\n\nWhat would you like to book today?`,
      buttonLabel: "Select Service",
      rows: services.map((s, i) =>
        toRow(String(i + 1), s.name, `${s.durationMinutes} min · ₹${Number(s.price).toFixed(2)}`),
      ),
    };
  }

  private async handleServiceSelection(
    phone: string,
    session: ConversationState,
    body: string,
  ): Promise<BotReply> {
    const serviceId = resolveNumberedSelection(body, session.presentedServiceIds ?? []);
    if (serviceId === null) {
      return textReply("Sorry, I didn't get that - please pick a service from the list.");
    }

    const staff = (await this.staffRepo.findAllActive()).slice(0, MAX_LIST_ROWS);
    if (staff.length === 0) {
      await this.sessions.clear(phone);
      return textReply(
        "Sorry, there's no staff available for booking right now. Please call the salon directly.",
      );
    }

    await this.sessions.set(phone, {
      ...session,
      step: "AWAITING_STAFF",
      serviceId,
      presentedStaffIds: staff.map((s) => s.id),
    });

    return {
      kind: "list",
      bodyText: "Who would you like to book with?",
      buttonLabel: "Select Staff",
      rows: staff.map((s, i) => toRow(String(i + 1), s.name)),
    };
  }

  private async handleStaffSelection(
    phone: string,
    session: ConversationState,
    body: string,
  ): Promise<BotReply> {
    const staffId = resolveNumberedSelection(body, session.presentedStaffIds ?? []);
    if (staffId === null) {
      return textReply("Sorry, I didn't get that - please pick a staff member from the list.");
    }

    await this.sessions.set(phone, { ...session, step: "AWAITING_DATE", staffId });
    return {
      kind: "buttons",
      bodyText: "What date works for you?",
      buttons: DATE_BUTTONS,
    };
  }

  private async handleDateInput(
    phone: string,
    session: ConversationState,
    body: string,
  ): Promise<BotReply> {
    if (body === "custom") {
      return textReply('Sure - what date? Reply like "25-12" (day-month).');
    }

    const date = parseRequestedDate(body);
    if (!date) {
      return textReply(
        'Sorry, I didn\'t understand that date. Try "today", "tomorrow", or "25-12".',
      );
    }

    // Both are set by the time we reach this step - AWAITING_DATE is only entered from handleStaffSelection.
    const serviceId = session.serviceId!;
    const staffId = session.staffId!;

    const slots = (await this.appointmentService.getAvailability(staffId, serviceId, date)).slice(
      0,
      MAX_LIST_ROWS,
    );
    if (slots.length === 0) {
      return textReply(
        'No open slots that day. Try a different date, or reply "cancel" to start over.',
      );
    }

    await this.sessions.set(phone, {
      ...session,
      step: "AWAITING_SLOT",
      presentedSlots: slots.map((s) => ({
        start: s.start.toISOString(),
        end: s.end.toISOString(),
      })),
    });

    return {
      kind: "list",
      bodyText: "Available times:",
      buttonLabel: "Select Time",
      rows: slots.map((s, i) => toRow(String(i + 1), formatTime24h(s.start))),
    };
  }

  private async handleSlotSelection(
    phone: string,
    session: ConversationState,
    body: string,
  ): Promise<BotReply> {
    const slot = resolveNumberedSelection(body, session.presentedSlots ?? []);
    if (!slot) {
      return textReply("Sorry, I didn't get that - please pick a time from the list.");
    }

    await this.sessions.set(phone, { ...session, step: "AWAITING_CONFIRM", pendingSlot: slot });
    return this.buildConfirmReply(session, slot);
  }

  private async buildConfirmReply(session: ConversationState, slot: SlotOption): Promise<BotReply> {
    const [service, staff] = await Promise.all([
      this.serviceRepo.findById(session.serviceId!),
      this.staffRepo.findById(session.staffId!),
    ]);
    const start = new Date(slot.start);

    return {
      kind: "buttons",
      bodyText:
        "Please confirm your appointment:\n\n" +
        `💇 ${service?.name ?? "Service"}\n` +
        `🧑 with ${staff?.name ?? "staff"}\n` +
        `📅 ${formatDateHuman(start)} · ${formatTime24h(start)}`,
      buttons: CONFIRM_BUTTONS,
    };
  }

  private async handleConfirm(
    phone: string,
    session: ConversationState,
    body: string,
  ): Promise<BotReply> {
    if (body !== "confirm") {
      return {
        kind: "buttons",
        bodyText: "Please tap Confirm or Cancel.",
        buttons: CONFIRM_BUTTONS,
      };
    }

    const slot = session.pendingSlot!;
    const startTime = new Date(slot.start);
    const endTime = new Date(slot.end);

    try {
      await this.appointmentService.book({
        customerId: session.customerId,
        staffId: session.staffId!,
        serviceId: session.serviceId!,
        startTime,
        endTime,
        source: "WHATSAPP",
      });
    } catch (err) {
      if (err instanceof AppError && err.code === "SLOT_UNAVAILABLE") {
        await this.sessions.set(phone, { ...session, step: "AWAITING_DATE" });
        return textReply(
          'Sorry, that slot was just booked by someone else. Please pick a date again, or reply "cancel" to start over.',
        );
      }
      throw err;
    }

    await this.sessions.clear(phone);
    return textReply(
      `✅ You're all set for ${formatDateHuman(startTime)} at ${formatTime24h(startTime)}! We look forward to seeing you.`,
    );
  }
}
