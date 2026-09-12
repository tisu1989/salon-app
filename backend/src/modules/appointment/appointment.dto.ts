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

export const listAppointmentsQuerySchema = z.object({
  staffId: z.coerce.number().int().positive(),
  date: z.coerce.date(),
});
export type ListAppointmentsQueryDto = z.infer<typeof listAppointmentsQuerySchema>;
