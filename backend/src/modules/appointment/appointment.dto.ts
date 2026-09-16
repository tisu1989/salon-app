import { z } from "zod";

export const availabilityQuerySchema = z.object({
  staffId: z.coerce.number().int().positive(),
  serviceId: z.coerce.number().int().positive(),
  date: z.coerce.date(),
});
export type AvailabilityQueryDto = z.infer<typeof availabilityQuerySchema>;

export const createAppointmentSchema = z.object({
  customerId: z.number().int().positive(),
  staffId: z.number().int().positive(),
  serviceId: z.number().int().positive(),
  startTime: z.coerce.date(),
  endTime: z.coerce.date(),
});
export type CreateAppointmentDto = z.infer<typeof createAppointmentSchema>;

// Either customerId (their full history) or date (that day's board, optionally
// narrowed to one staff member) - never both interpretations of the same request.
export const listAppointmentsQuerySchema = z
  .object({
    staffId: z.coerce.number().int().positive().optional(),
    date: z.coerce.date().optional(),
    customerId: z.coerce.number().int().positive().optional(),
  })
  .refine((q) => q.customerId !== undefined || q.date !== undefined, {
    message: "provide either customerId, or date (optionally with staffId)",
  });
export type ListAppointmentsQueryDto = z.infer<typeof listAppointmentsQuerySchema>;
