import type { Appointment, Role } from "@prisma/client";
import { AppError } from "../../middleware/error-handler.js";
import type { AppointmentService } from "../appointment/appointment.service.js";
import type { StaffRepository } from "../staff/staff.repository.js";
import type { CustomerRepository } from "../customer/customer.repository.js";
import type { ServiceRepository } from "../service/service.repository.js";
import type { AnalyticsService } from "../analytics/analytics.service.js";
import {
  analyticsArgsSchema,
  appointmentIdArgsSchema,
  dateArgsSchema,
  staffScheduleArgsSchema,
} from "./chat.dto.js";
import { toolsForRole } from "./tools.js";
import { canActOnAppointment, type ChatUser } from "./ownership.js";
import { GroqClient, type GroqMessage } from "./groq.client.js";

// A confused model asking for more and more tools without ever answering would otherwise
// loop forever (and keep costing API calls) - this is the hard stop.
const MAX_TOOL_ITERATIONS = 5;

export class ChatService {
  constructor(
    private readonly groq: GroqClient,
    private readonly appointmentService: AppointmentService,
    private readonly staffRepo: StaffRepository,
    private readonly customerRepo: CustomerRepository,
    private readonly serviceRepo: ServiceRepository,
    private readonly analyticsService: AnalyticsService,
  ) {}

  async reply(user: ChatUser, userMessage: string, history: GroqMessage[]): Promise<string> {
    const tools = toolsForRole(user.role as Role);
    const messages: GroqMessage[] = [
      { role: "system", content: this.systemPrompt(user) },
      ...history,
      { role: "user", content: userMessage },
    ];

    for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
      const reply = await this.groq.chat(messages, tools);

      if (reply.toolCalls.length === 0) {
        return reply.content ?? "Sorry, I'm not sure how to help with that.";
      }

      messages.push({
        role: "assistant",
        content: reply.content ?? "",
        tool_calls: reply.toolCalls,
      });

      for (const call of reply.toolCalls) {
        const result = await this.runToolSafely(call.function.name, call.function.arguments, user);
        messages.push({ role: "tool", tool_call_id: call.id, content: JSON.stringify(result) });
      }
    }

    return "Sorry, that's taking longer than expected - could you try rephrasing your request?";
  }

  private systemPrompt(user: ChatUser): string {
    const today = new Date().toISOString().slice(0, 10);
    const whoAmI = user.role === "ADMIN" ? "a salon admin" : "a staff member";
    return (
      `You are the salon's internal staff assistant. Today's date is ${today}. ` +
      `You're talking to ${whoAmI} (id ${user.id}). Only use the tools you've been given - ` +
      `never claim to have done something you don't have a tool for. Keep replies short and friendly.`
    );
  }

  /** Runs a tool call, turning any failure (bad arguments, not-found, forbidden) into a
   *  tool-result the AI can read and react to, instead of crashing the whole request. */
  private async runToolSafely(
    name: string,
    rawArguments: string,
    user: ChatUser,
  ): Promise<unknown> {
    try {
      const args: unknown = JSON.parse(rawArguments);
      return await this.runTool(name, args, user);
    } catch (err) {
      return { error: err instanceof Error ? err.message : "Something went wrong running that." };
    }
  }

  private async runTool(name: string, args: unknown, user: ChatUser): Promise<unknown> {
    switch (name) {
      case "get_my_schedule": {
        const { date } = dateArgsSchema.parse(args);
        const appointments = await this.appointmentService.listForDay(date, user.id);
        return Promise.all(appointments.map((a) => this.summarizeAppointment(a)));
      }
      case "mark_appointment_completed":
        return this.updateOwnedAppointment(args, user, (id) =>
          this.appointmentService.markCompleted(id),
        );
      case "mark_appointment_no_show":
        return this.updateOwnedAppointment(args, user, (id) =>
          this.appointmentService.markNoShow(id),
        );
      case "confirm_appointment":
        return this.updateOwnedAppointment(args, user, (id) => this.appointmentService.confirm(id));
      case "get_staff_schedule": {
        this.requireAdmin(user);
        const { staffId, date } = staffScheduleArgsSchema.parse(args);
        const appointments = await this.appointmentService.listForDay(date, staffId);
        return Promise.all(appointments.map((a) => this.summarizeAppointment(a)));
      }
      case "list_active_staff": {
        this.requireAdmin(user);
        const staff = await this.staffRepo.findAllActive();
        return staff.map((s) => ({ id: s.id, name: s.name }));
      }
      case "get_analytics_summary": {
        this.requireAdmin(user);
        const { days } = analyticsArgsSchema.parse(args);
        return this.analyticsService.getSummary(days);
      }
      default:
        return { error: `Unknown tool: ${name}` };
    }
  }

  private async updateOwnedAppointment(
    args: unknown,
    user: ChatUser,
    update: (appointmentId: number) => Promise<Appointment>,
  ): Promise<unknown> {
    const { appointmentId } = appointmentIdArgsSchema.parse(args);
    const appointment = await this.appointmentService.getById(appointmentId);
    if (!canActOnAppointment(appointment, user)) {
      throw new AppError("FORBIDDEN", "You can only update your own appointments.", 403);
    }
    return this.summarizeAppointment(await update(appointmentId));
  }

  private requireAdmin(user: ChatUser): void {
    if (user.role !== "ADMIN") {
      throw new AppError("FORBIDDEN", "Only an admin can do that.", 403);
    }
  }

  private async summarizeAppointment(appointment: Appointment): Promise<Record<string, unknown>> {
    const [customer, service] = await Promise.all([
      this.customerRepo.findById(appointment.customerId),
      this.serviceRepo.findById(appointment.serviceId),
    ]);
    return {
      id: appointment.id,
      customerName: customer?.name ?? "Unknown customer",
      serviceName: service?.name ?? "Unknown service",
      startTime: appointment.startTime.toISOString(),
      endTime: appointment.endTime.toISOString(),
      status: appointment.status,
    };
  }
}
