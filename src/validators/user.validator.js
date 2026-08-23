import { z } from "zod";

export const createUserSchema =
  z.object({
    body: z.object({
      name: z
        .string()
        .trim()
        .min(
          2,
          "Name must be at least 2 characters"
        )
        .max(
          100,
          "Name cannot exceed 100 characters"
        ),

      email: z
        .string()
        .trim()
        .email(
          "Invalid email address"
        )
        .max(254)
        .transform((value) =>
          value.toLowerCase()
        ),

      password: z
        .string()
        .min(
          8,
          "Password must be at least 8 characters"
        )
        .max(
          72,
          "Password cannot exceed 72 characters"
        ),

      role: z
        .enum([
          "admin",
          "employee"
        ])
        .default("employee")
    })
  });

export const updateUserSchema =
  z.object({
    params: z.object({
      id: z
        .string()
        .regex(
          /^[a-f\d]{24}$/i,
          "Invalid user ID"
        )
    }),

    body: z.object({
      name: z
        .string()
        .trim()
        .min(
          2,
          "Name must be at least 2 characters"
        )
        .max(
          100,
          "Name cannot exceed 100 characters"
        )
        .optional(),

      role: z
        .enum([
          "admin",
          "employee"
        ])
        .optional()
    })
  });

export const getUserSchema =
  z.object({
    params: z.object({
      id: z
        .string()
        .regex(
          /^[a-f\d]{24}$/i,
          "Invalid user ID"
        )
    })
  });

export const updateUserStatusSchema =
  z.object({
    params: z.object({
      id: z
        .string()
        .regex(
          /^[a-f\d]{24}$/i,
          "Invalid user ID"
        )
    }),

    body: z.object({
      isActive: z.boolean()
    })
  });