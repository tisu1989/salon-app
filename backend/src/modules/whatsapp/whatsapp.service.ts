import { AppError } from "../../middleware/error-handler.js";
import type { CustomerRepository } from "../customer/customer.repository.js";
import type { ServiceRepository } from "../service/service.repository.js";
import type { StaffRepository } from "../staff/staff.repository.js";
import type { AppointmentService } from "../appointment/appointment.service.js";
import {
  formatTime24h,
  isResetCommand,
  parseRequestedDate,
  resolveNumberedSelection,
} from "./bot-text.js";
import type { IncomingTextMessage } from "./whatsapp.dto.js";
import type { ConversationState, WhatsappSessionStore } from "./whatsapp.session.js";
import type { WhatsappClient } from "./whatsapp.client.js";

const MAX_SLOTS_SHOWN = 8;

/**
 * Drives the WhatsApp booking conversation: a small step-by-step state machine
 * (service -> staff -> date -> slot -> booked) backed by Redis, reusing the exact
 * same AppointmentService the staff panel uses - one source of truth for
 * availability and booking rules everywhere in the app.
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

  async handleIncomingMessage(message: IncomingTextMessage): Promise<void> {
    const reply = await this.processMessage(message);
    await this.client.sendTextMessage(message.from, reply);
  }

  private async processMessage(message: IncomingTextMessage): Promise<string> {
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
    }
  }

  private async startBooking(phone: string, contactName: string | undefined): Promise<string> {
    const customer = await this.customerRepo.findOrCreateByPhone(
      phone,
      contactName ?? "WhatsApp Customer",
    );

    const services = await this.serviceRepo.findAllActive();
    if (services.length === 0) {
      return "Sorry, we don't have any bookable services set up right now. Please call the salon directly.";
    }

    await this.sessions.set(phone, {
      step: "AWAITING_SERVICE",
      customerId: customer.id,
      presentedServiceIds: services.map((s) => s.id),
    });

    const menu = services
      .map((s, i) => `${i + 1}. ${s.name} (${s.durationMinutes} min)`)
      .join("\n");
    return `Hi${contactName ? " " + contactName : ""}! What would you like to book?\n${menu}\n\nReply with a number.`;
  }

  private async handleServiceSelection(
    phone: string,
    session: ConversationState,
    body: string,
  ): Promise<string> {
    const serviceId = resolveNumberedSelection(body, session.presentedServiceIds ?? []);
    if (serviceId === null) {
      return "Sorry, I didn't get that. Please reply with just the number next to the service you want.";
    }

    const staff = await this.staffRepo.findAllActive();
    if (staff.length === 0) {
      await this.sessions.clear(phone);
      return "Sorry, there's no staff available for booking right now. Please call the salon directly.";
    }

    await this.sessions.set(phone, {
      ...session,
      step: "AWAITING_STAFF",
      serviceId,
      presentedStaffIds: staff.map((s) => s.id),
    });

    const menu = staff.map((s, i) => `${i + 1}. ${s.name}`).join("\n");
    return `Who would you like to book with?\n${menu}\n\nReply with a number.`;
  }

  private async handleStaffSelection(
    phone: string,
    session: ConversationState,
    body: string,
  ): Promise<string> {
    const staffId = resolveNumberedSelection(body, session.presentedStaffIds ?? []);
    if (staffId === null) {
      return "Sorry, I didn't get that. Please reply with just the number next to the staff member you want.";
    }

    await this.sessions.set(phone, { ...session, step: "AWAITING_DATE", staffId });
    return 'What date? Reply "today", "tomorrow", or a date like "25-12".';
  }

  private async handleDateInput(
    phone: string,
    session: ConversationState,
    body: string,
  ): Promise<string> {
    const date = parseRequestedDate(body);
    if (!date) {
      return 'Sorry, I didn\'t understand that date. Try "today", "tomorrow", or "25-12".';
    }

    // Both are set by the time we reach this step - AWAITING_DATE is only entered from handleStaffSelection.
    const serviceId = session.serviceId!;
    const staffId = session.staffId!;

    const slots = await this.appointmentService.getAvailability(staffId, serviceId, date);
    if (slots.length === 0) {
      return 'No open slots that day. Try a different date, or reply "cancel" to start over.';
    }

    const shown = slots.slice(0, MAX_SLOTS_SHOWN);
    await this.sessions.set(phone, {
      ...session,
      step: "AWAITING_SLOT",
      presentedSlots: shown.map((s) => ({
        start: s.start.toISOString(),
        end: s.end.toISOString(),
      })),
    });

    const menu = shown.map((s, i) => `${i + 1}. ${formatTime24h(s.start)}`).join("\n");
    return `Available times:\n${menu}\n\nReply with a number.`;
  }

  private async handleSlotSelection(
    phone: string,
    session: ConversationState,
    body: string,
  ): Promise<string> {
    const slot = resolveNumberedSelection(body, session.presentedSlots ?? []);
    if (!slot) {
      return "Sorry, I didn't get that. Please reply with just the number next to the time you want.";
    }

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
        return 'Sorry, that slot was just booked by someone else. Please pick a date again, or reply "cancel" to start over.';
      }
      throw err;
    }

    await this.sessions.clear(phone);
    return `You're all set for ${formatTime24h(startTime)}! We look forward to seeing you.`;
  }
}
