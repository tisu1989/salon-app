import type { Request, Response } from "express";
import { AppError } from "../../middleware/error-handler.js";
import type { ServiceRepository } from "./service.repository.js";
import type { CreateServiceDto, UpdateServiceDto } from "./service.dto.js";

function parseServiceId(req: Request): number {
  const serviceId = Number(req.params.id);
  if (!Number.isInteger(serviceId) || serviceId <= 0) {
    throw new AppError("VALIDATION_ERROR", "id must be a positive integer", 400);
  }
  return serviceId;
}

export class ServiceController {
  constructor(private readonly serviceRepo: ServiceRepository) {}

  listActive = async (_req: Request, res: Response): Promise<void> => {
    const services = await this.serviceRepo.findAllActive();
    res.status(200).json({ services });
  };

  /** Admin-only: adds a new bookable service. */
  create = async (req: Request, res: Response): Promise<void> => {
    const dto = req.body as CreateServiceDto;
    const service = await this.serviceRepo.create({
      name: dto.name,
      durationMinutes: dto.durationMinutes,
      price: dto.price,
      ...(dto.category !== undefined && { category: dto.category }),
    });
    res.status(201).json({ service });
  };

  /** Admin-only: edits a service's details (name, duration, price, category). */
  update = async (req: Request, res: Response): Promise<void> => {
    const serviceId = parseServiceId(req);
    const dto = req.body as UpdateServiceDto;

    // Omit rather than pass `undefined` through - see staff.controller.ts's
    // `update` for why (exactOptionalPropertyTypes vs. Prisma's update() input).
    const service = await this.serviceRepo.update(serviceId, {
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.category !== undefined && { category: dto.category }),
      ...(dto.durationMinutes !== undefined && { durationMinutes: dto.durationMinutes }),
      ...(dto.price !== undefined && { price: dto.price }),
    });
    if (!service) {
      throw new AppError("SERVICE_NOT_FOUND", `Service ${serviceId} does not exist`, 404);
    }

    res.status(200).json({ service });
  };

  /** Admin-only: soft-deletes a service (e.g. discontinued) - past appointments are untouched. */
  deactivate = async (req: Request, res: Response): Promise<void> => {
    const serviceId = parseServiceId(req);

    const service = await this.serviceRepo.setActive(serviceId, false);
    if (!service) {
      throw new AppError("SERVICE_NOT_FOUND", `Service ${serviceId} does not exist`, 404);
    }

    res.status(200).json({ service });
  };
}
