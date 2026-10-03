import type { Role } from "@prisma/client";

/**
 * One "card" the AI can choose from - a description of a real backend action it's allowed
 * to request, in the JSON-schema shape Groq's tool-calling API expects. The AI never runs
 * these itself; it only ever asks ChatService to run one, by name.
 */
export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, { type: string; description: string }>;
    required: string[];
  };
}

const GET_MY_SCHEDULE: ToolDefinition = {
  name: "get_my_schedule",
  description: "Get the logged-in staff member's own appointments for a given date.",
  parameters: {
    type: "object",
    properties: { date: { type: "string", description: "Date in YYYY-MM-DD format." } },
    required: ["date"],
  },
};

const MARK_APPOINTMENT_COMPLETED: ToolDefinition = {
  name: "mark_appointment_completed",
  description: "Mark an appointment as completed - the service was delivered.",
  parameters: {
    type: "object",
    properties: { appointmentId: { type: "number", description: "The appointment's id." } },
    required: ["appointmentId"],
  },
};

const MARK_APPOINTMENT_NO_SHOW: ToolDefinition = {
  name: "mark_appointment_no_show",
  description: "Mark an appointment as a no-show - the customer never turned up.",
  parameters: {
    type: "object",
    properties: { appointmentId: { type: "number", description: "The appointment's id." } },
    required: ["appointmentId"],
  },
};

const CONFIRM_APPOINTMENT: ToolDefinition = {
  name: "confirm_appointment",
  description: "Confirm a booked appointment - the customer has verified they're coming.",
  parameters: {
    type: "object",
    properties: { appointmentId: { type: "number", description: "The appointment's id." } },
    required: ["appointmentId"],
  },
};

const GET_STAFF_SCHEDULE: ToolDefinition = {
  name: "get_staff_schedule",
  description:
    "Get any staff member's appointments for a given date. Admin only - use list_active_staff " +
    "first if you only know the person's name, not their id.",
  parameters: {
    type: "object",
    properties: {
      staffId: { type: "number", description: "The staff member's id." },
      date: { type: "string", description: "Date in YYYY-MM-DD format." },
    },
    required: ["staffId", "date"],
  },
};

const LIST_ACTIVE_STAFF: ToolDefinition = {
  name: "list_active_staff",
  description: "List every active staff member's id and name. Admin only.",
  parameters: { type: "object", properties: {}, required: [] },
};

const GET_ANALYTICS_SUMMARY: ToolDefinition = {
  name: "get_analytics_summary",
  description:
    "Get business-wide booking numbers (counts by status) for the trailing N days. Admin only.",
  parameters: {
    type: "object",
    properties: {
      days: { type: "number", description: "How many trailing days to summarize. Defaults to 7." },
    },
    required: [],
  },
};

// Every STAFF member gets these - each one only ever acts on their own appointments
// (enforced again, server-side, in chat.service.ts - this list is the first line of
// defense, not the only one).
const STAFF_TOOLS: ToolDefinition[] = [
  GET_MY_SCHEDULE,
  MARK_APPOINTMENT_COMPLETED,
  MARK_APPOINTMENT_NO_SHOW,
  CONFIRM_APPOINTMENT,
];

// ADMIN gets everything STAFF has, plus these business-wide ones.
const ADMIN_ONLY_TOOLS: ToolDefinition[] = [
  GET_STAFF_SCHEDULE,
  LIST_ACTIVE_STAFF,
  GET_ANALYTICS_SUMMARY,
];

/** The stack of "cards" to hand the AI for this conversation - never more than the asker's role allows. */
export function toolsForRole(role: Role): ToolDefinition[] {
  return role === "ADMIN" ? [...STAFF_TOOLS, ...ADMIN_ONLY_TOOLS] : STAFF_TOOLS;
}
