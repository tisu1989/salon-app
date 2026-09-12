import type { Request, Response } from "express";
import { AppError } from "../../middleware/error-handler.js";
import { getValidatedQuery } from "../../middleware/validate.js";
import type { CustomerRepository } from "./customer.repository.js";
import type { CreateCustomerDto, SearchCustomerQueryDto } from "./customer.dto.js";

export class CustomerController {
  constructor(private readonly customerRepo: CustomerRepository) {}

  /**
   * Idempotent by phone: booking a new customer twice (e.g. a double-click, or the
   * staff panel and WhatsApp both seeing the same walk-in) returns the same record
   * instead of erroring on the unique constraint.
   */
  create = async (req: Request, res: Response): Promise<void> => {
    const { name, phone } = req.body as CreateCustomerDto;
    const customer = await this.customerRepo.findOrCreateByPhone(phone, name);
    res.status(200).json({ customer });
  };

  search = async (req: Request, res: Response): Promise<void> => {
    const { q } = getValidatedQuery<SearchCustomerQueryDto>(req);
    const customers = await this.customerRepo.search(q);
    res.status(200).json({ customers });
  };

  getById = async (req: Request, res: Response): Promise<void> => {
    const customerId = Number(req.params.id);
    if (!Number.isInteger(customerId) || customerId <= 0) {
      throw new AppError("VALIDATION_ERROR", "id must be a positive integer", 400);
    }

    const customer = await this.customerRepo.findById(customerId);
    if (!customer) {
      throw new AppError("CUSTOMER_NOT_FOUND", `Customer ${customerId} does not exist`, 404);
    }
    res.status(200).json({ customer });
  };
}
