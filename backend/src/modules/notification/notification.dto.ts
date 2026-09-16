import { z } from "zod";

export const listNotificationsQuerySchema = z.object({
  status: z.enum(["PENDING", "SENT", "FAILED"]).optional(),
  limit: z.coerce.number().int().positive().max(200).optional(),
});
export type ListNotificationsQueryDto = z.infer<typeof listNotificationsQuerySchema>;
