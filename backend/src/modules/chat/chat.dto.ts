import { z } from "zod";

const chatMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string(),
});

export const chatRequestSchema = z.object({
  message: z.string().min(1),
  // The conversation so far, kept by the frontend only - nothing is saved server-side.
  // Capped so one request can't send an unbounded amount of history.
  history: z.array(chatMessageSchema).max(20).optional(),
});
export type ChatRequestDto = z.infer<typeof chatRequestSchema>;

// Arguments the AI sends when it requests a tool - validated the same way every other
// request body in this app is, so a malformed tool call fails clearly instead of crashing.
export const dateArgsSchema = z.object({ date: z.coerce.date() });
export const appointmentIdArgsSchema = z.object({
  appointmentId: z.coerce.number().int().positive(),
});
export const staffScheduleArgsSchema = z.object({
  staffId: z.coerce.number().int().positive(),
  date: z.coerce.date(),
});
export const analyticsArgsSchema = z.object({
  days: z.coerce.number().int().positive().optional(),
});
