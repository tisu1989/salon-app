import type { Request, Response } from "express";
import { AppError } from "../../middleware/error-handler.js";
import { getValidatedQuery } from "../../middleware/validate.js";
import type { NotificationService } from "./notification.service.js";
import type { ListNotificationsQueryDto } from "./notification.dto.js";

const DEFAULT_LIST_LIMIT = 50;

function parseNotificationId(req: Request): number {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    throw new AppError("VALIDATION_ERROR", "id must be a positive integer", 400);
  }
  return id;
}

export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  list = async (req: Request, res: Response): Promise<void> => {
    const { status, limit } = getValidatedQuery<ListNotificationsQueryDto>(req);
    const notifications = await this.notificationService.list(limit ?? DEFAULT_LIST_LIMIT, status);
    res.status(200).json({ notifications });
  };

  /** Admin-only: manually retries a FAILED notification. */
  retry = async (req: Request, res: Response): Promise<void> => {
    await this.notificationService.retry(parseNotificationId(req));
    res.status(204).send();
  };
}
