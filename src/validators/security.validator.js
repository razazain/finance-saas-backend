import { z } from "zod";
export const verifyEmailSchema = z.object({
  body: z.object({ token: z.string().min(20) }),
});
export const resetRequestSchema = z.object({
  body: z.object({
    email: z
      .string()
      .email()
      .transform((v) => v.toLowerCase()),
  }),
});
export const resetPasswordSchema = z.object({
  body: z.object({
    token: z.string().min(20),
    password: z.string().min(8).max(72),
  }),
});
export const mfaCodeSchema = z.object({
  body: z.object({ code: z.string().regex(/^\d{6}$/) }),
});
