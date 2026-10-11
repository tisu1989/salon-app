import { z } from "zod";

export const requestExportSchema = z.object({
  // Only one export type exists today - the literal keeps the door open for more
  // without weakening validation to a bare string.
  type: z.literal("APPOINTMENTS"),
  date: z.coerce.date(),
});
export type RequestExportDto = z.infer<typeof requestExportSchema>;

export const listExportsQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(100).optional(),
});
export type ListExportsQueryDto = z.infer<typeof listExportsQuerySchema>;
