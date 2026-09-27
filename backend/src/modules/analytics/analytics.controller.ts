import type { Request, Response } from "express";
import { getValidatedQuery } from "../../middleware/validate.js";
import type { AnalyticsService } from "./analytics.service.js";
import type { AnalyticsSummaryQueryDto } from "./analytics.dto.js";

export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  getSummary = async (req: Request, res: Response): Promise<void> => {
    const { days } = getValidatedQuery<AnalyticsSummaryQueryDto>(req);
    const summary = await this.analyticsService.getSummary(days);
    res.status(200).json(summary);
  };
}
