import { z } from "zod";

export const createStaffSchema = z.object({
  name: z.string().min(1),
  phone: z.string().min(1),
  email: z.string().email().optional(),
  password: z.string().min(8, "password must be at least 8 characters"),
  role: z.enum(["STAFF", "ADMIN"]).default("STAFF"),
});
export type CreateStaffDto = z.infer<typeof createStaffSchema>;

const timeString = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "must be in HH:mm 24h format, e.g. 09:00");

const workingHoursRuleSchema = z
  .object({
    dayOfWeek: z.number().int().min(0).max(6),
    startTime: timeString,
    endTime: timeString,
  })
  .refine((r) => r.startTime < r.endTime, {
    message: "endTime must be after startTime",
    path: ["endTime"],
  });

export const setWorkingHoursSchema = z.object({
  rules: z
    .array(workingHoursRuleSchema)
    .refine((rules) => new Set(rules.map((r) => r.dayOfWeek)).size === rules.length, {
      message: "each dayOfWeek may only appear once",
    }),
});
export type SetWorkingHoursDto = z.infer<typeof setWorkingHoursSchema>;

export const createTimeOffSchema = z
  .object({
    startDateTime: z.coerce.date(),
    endDateTime: z.coerce.date(),
    reason: z.string().optional(),
  })
  .refine((r) => r.endDateTime > r.startDateTime, {
    message: "endDateTime must be after startDateTime",
    path: ["endDateTime"],
  });
export type CreateTimeOffDto = z.infer<typeof createTimeOffSchema>;
