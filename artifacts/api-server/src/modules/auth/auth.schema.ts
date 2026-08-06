import { z } from "zod";

export const RegisterSchema = z
  .object({
    email: z.string().email().optional(),
    mobile: z.string().min(7).max(20).optional(),
    password: z.string().min(8).max(128),
    referralCode: z.string().optional(),
  })
  .refine((data) => data.email != null || data.mobile != null, {
    message: "Either email or mobile is required",
    path: ["email"],
  });

export const LoginSchema = z.object({
  identifier: z.string().min(1),
  password: z.string().min(1),
});

export const RefreshSchema = z.object({
  refreshToken: z.string().min(1),
});

export const EmailVerifySchema = z.object({
  token: z.string().min(1),
});

export type RegisterInput = z.infer<typeof RegisterSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
export type RefreshInput = z.infer<typeof RefreshSchema>;
