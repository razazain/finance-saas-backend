import { z } from "zod";

const objectIdSchema = z
  .string()
  .regex(
    /^[a-f\d]{24}$/i,
    "Invalid category ID"
  );

export const createCategorySchema =
  z.object({
    body: z.object({
      name: z
        .string()
        .trim()
        .min(
          2,
          "Category name must be at least 2 characters"
        )
        .max(
          100,
          "Category name cannot exceed 100 characters"
        ),

      type: z.enum(
        [
          "income",
          "expense"
        ],
        {
          message:
            "Category type must be income or expense"
        }
      ),

      description: z
        .string()
        .trim()
        .max(
          500,
          "Description cannot exceed 500 characters"
        )
        .optional()
    })
  });

export const listCategorySchema =
  z.object({
    query: z.object({
      type: z
        .enum([
          "income",
          "expense"
        ])
        .optional(),

      isActive: z
        .enum([
          "true",
          "false"
        ])
        .transform(
          (value) =>
            value === "true"
        )
        .optional()
    })
  });

export const categoryIdSchema =
  z.object({
    params: z.object({
      id: objectIdSchema
    })
  });

export const updateCategorySchema =
  z.object({
    params: z.object({
      id: objectIdSchema
    }),

    body: z.object({
      name: z
        .string()
        .trim()
        .min(
          2,
          "Category name must be at least 2 characters"
        )
        .max(
          100,
          "Category name cannot exceed 100 characters"
        )
        .optional(),

      description: z
        .string()
        .trim()
        .max(
          500,
          "Description cannot exceed 500 characters"
        )
        .nullable()
        .optional()
    })
  });

export const updateCategoryStatusSchema =
  z.object({
    params: z.object({
      id: objectIdSchema
    }),

    body: z.object({
      isActive: z.boolean()
    })
  });