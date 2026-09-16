import { z } from "zod";

export const loginSchema = z.object({
  /** Staff phone number or email - either works as the login identifier. */
  identifier: z.string().min(1, "identifier is required"),
  password: z.string().min(1, "password is required"),
});
export type LoginDto = z.infer<typeof loginSchema>;

export const refreshSchema = z.object({
  refreshToken: z.string().min(1, "refreshToken is required"),
});
export type RefreshDto = z.infer<typeof refreshSchema>;

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "currentPassword is required"),
  newPassword: z.string().min(8, "newPassword must be at least 8 characters"),
});
export type ChangePasswordDto = z.infer<typeof changePasswordSchema>;
