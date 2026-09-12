import { z } from "zod";

export const createCustomerSchema = z.object({
  name: z.string().min(1),
  phone: z.string().min(1),
});
export type CreateCustomerDto = z.infer<typeof createCustomerSchema>;

export const searchCustomerQuerySchema = z.object({
  q: z.string().min(1, "q is required"),
});
export type SearchCustomerQueryDto = z.infer<typeof searchCustomerQuerySchema>;
