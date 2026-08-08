import { z } from "zod";

const registerBodySchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name cannot exceed 100 characters"),

  email: z
    .string()
    .trim()
    .email("Invalid email address")
    .max(254, "Email is too long")
    .transform((value) => value.toLowerCase()),

  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(72, "Password cannot exceed 72 characters"),

  businessName: z
    .string()
    .trim()
    .min(2, "Business name must be at least 2 characters")
    .max(100, "Business name cannot exceed 100 characters"),

  country: z
    .string()
    .trim()
    .max(100)
    .optional(),

  currency: z
    .string()
    .trim()
    .length(3, "Currency must contain 3 characters")
    .transform((value) => value.toUpperCase())
    .default("PKR")
});

export const registerSchema = z.object({
  body: registerBodySchema
});

const loginBodySchema = z.object({
  email: z
    .string()
    .trim()
    .email("Invalid email address")
    .max(254)
    .transform((value) => value.toLowerCase()),

  password: z
    .string()
    .min(1, "Password is required")
    .max(72)
});

export const loginSchema = z.object({
  body: loginBodySchema
});