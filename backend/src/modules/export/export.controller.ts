import type { Request, Response } from "express";
import { AppError } from "../../middleware/error-handler.js";
import { getValidatedQuery } from "../../middleware/validate.js";
import type { ExportService } from "./export.service.js";
import type { ListExportsQueryDto, RequestExportDto } from "./export.dto.js";

function parseExportId(req: Request): number {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    throw new AppError("VALIDATION_ERROR", "id must be a positive integer", 400);
  }
  return id;
}

export class ExportController {
  constructor(private readonly exportService: ExportService) {}

  /** Queues a new export - returns right away with a PENDING row; the worker builds it shortly after. */
  request = async (req: Request, res: Response): Promise<void> => {
    const { type, date } = req.body as RequestExportDto;
    const exported = await this.exportService.request({
      type,
      date,
      requestedById: req.user!.id,
    });
    res.status(201).json({ export: exported });
  };

  list = async (req: Request, res: Response): Promise<void> => {
    const { limit } = getValidatedQuery<ListExportsQueryDto>(req);
    const exports = await this.exportService.list(limit);
    res.status(200).json({ exports });
  };

  download = async (req: Request, res: Response): Promise<void> => {
    const { fileName, content } = await this.exportService.getDownload(parseExportId(req));
    res
      .status(200)
      .type("text/csv")
      .set("Content-Disposition", `attachment; filename="${fileName}"`)
      .send(content);
  };
}
