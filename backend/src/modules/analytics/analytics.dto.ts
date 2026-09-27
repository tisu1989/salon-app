import { z } from "zod";

export const analyticsSummaryQuerySchema = z.object({
  // Capped at 90 - this queries every appointment in the window into memory to aggregate;
  // fine for a single salon's volume over a week or two, not worth supporting "all time" yet.
  days: z.coerce.number().int().min(1).max(90).optional(),
});
export type AnalyticsSummaryQueryDto = z.infer<typeof analyticsSummaryQuerySchema>;
