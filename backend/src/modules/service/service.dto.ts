import { z } from "zod";

export const createServiceSchema = z.object({
  name: z.string().min(1),
  category: z.string().min(1).optional(),
  durationMinutes: z.number().int().positive(),
  price: z.number().positive(),
});
export type CreateServiceDto = z.infer<typeof createServiceSchema>;

export const updateServiceSchema = z
  .object({
    name: z.string().min(1).optional(),
    category: z.string().min(1).nullable().optional(),
    durationMinutes: z.number().int().positive().optional(),
    price: z.number().positive().optional(),
  })
  .refine((body) => Object.keys(body).length > 0, {
    message: "provide at least one field to update",
  });
export type UpdateServiceDto = z.infer<typeof updateServiceSchema>;
