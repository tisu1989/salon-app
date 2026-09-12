import { Prisma, type PrismaClient, type Service } from "@prisma/client";

export interface CreateServiceInput {
  name: string;
  category?: string;
  durationMinutes: number;
  price: number;
}

export interface UpdateServiceInput {
  name?: string;
  category?: string | null;
  durationMinutes?: number;
  price?: number;
  isActive?: boolean;
}

export class ServiceRepository {
  constructor(private readonly db: PrismaClient) {}

  async findById(serviceId: number): Promise<Service | null> {
    return this.db.service.findUnique({ where: { id: serviceId } });
  }

  async findAllActive(): Promise<Service[]> {
    return this.db.service.findMany({ where: { isActive: true }, orderBy: { name: "asc" } });
  }

  async create(input: CreateServiceInput): Promise<Service> {
    return this.db.service.create({ data: input });
  }

  /** Returns null if the service doesn't exist - callers decide whether that's a 404. */
  async update(serviceId: number, input: UpdateServiceInput): Promise<Service | null> {
    try {
      return await this.db.service.update({ where: { id: serviceId }, data: input });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
        return null;
      }
      throw err;
    }
  }

  async setActive(serviceId: number, isActive: boolean): Promise<Service | null> {
    return this.update(serviceId, { isActive });
  }
}
