import type { PrismaClient, Service } from "@prisma/client";

export class ServiceRepository {
  constructor(private readonly db: PrismaClient) {}

  async findById(serviceId: number): Promise<Service | null> {
    return this.db.service.findUnique({ where: { id: serviceId } });
  }
}
