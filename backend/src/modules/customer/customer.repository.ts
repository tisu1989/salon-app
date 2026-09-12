import { Prisma, type Customer, type PrismaClient } from "@prisma/client";

export interface CreateCustomerInput {
  name: string;
  phone: string;
}

export class CustomerRepository {
  constructor(private readonly db: PrismaClient) {}

  async findById(customerId: number): Promise<Customer | null> {
    return this.db.customer.findUnique({ where: { id: customerId } });
  }

  async findByPhone(phone: string): Promise<Customer | null> {
    return this.db.customer.findUnique({ where: { phone } });
  }

  /** Matches on name (contains, case-insensitive) or phone (exact) - the two things a staff member searches by. */
  async search(query: string): Promise<Customer[]> {
    return this.db.customer.findMany({
      where: {
        OR: [{ name: { contains: query } }, { phone: query }],
      },
      orderBy: { name: "asc" },
      take: 20,
    });
  }

  async create(input: CreateCustomerInput): Promise<Customer> {
    return this.db.customer.create({ data: input });
  }

  /**
   * Looks up a customer by phone, creating one if they've never been seen before.
   * This is the entry point the WhatsApp bot will use - a first-time texter shouldn't
   * need a separate "sign up" step before they can book.
   */
  async findOrCreateByPhone(phone: string, name: string): Promise<Customer> {
    const existing = await this.findByPhone(phone);
    if (existing) {
      return existing;
    }

    try {
      return await this.create({ name, phone });
    } catch (err) {
      // Two concurrent first-time messages from the same number could both miss the
      // findByPhone check above - if the unique constraint caught that race, just
      // fetch the row the other request created instead of failing.
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        const winner = await this.findByPhone(phone);
        if (winner) {
          return winner;
        }
      }
      throw err;
    }
  }
}
