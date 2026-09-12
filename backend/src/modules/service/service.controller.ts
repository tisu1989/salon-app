import type { Request, Response } from "express";
import type { ServiceRepository } from "./service.repository.js";

export class ServiceController {
  constructor(private readonly serviceRepo: ServiceRepository) {}

  listActive = async (_req: Request, res: Response): Promise<void> => {
    const services = await this.serviceRepo.findAllActive();
    res.status(200).json({ services });
  };
}
