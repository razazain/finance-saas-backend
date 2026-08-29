import { z } from "zod";

const dateTimeSchema =
  z
    .string()
    .datetime({
      offset: true
    });

export const dashboardDateRangeSchema =
  z.object({
    query: z.object({
      from:
        dateTimeSchema.optional(),

      to:
        dateTimeSchema.optional()
    })
  });

export const categoryBreakdownSchema =
  z.object({
    query: z.object({
      from:
        dateTimeSchema.optional(),

      to:
        dateTimeSchema.optional(),

      type: z
        .enum([
          "income",
          "expense"
        ])
        .optional()
    })
  });

export const recentTransactionsSchema =
  z.object({
    query: z.object({
      limit: z
        .string()
        .regex(
          /^\d+$/
        )
        .transform(Number)
        .refine(
          (value) =>
            value >= 1 &&
            value <= 50,
          "Limit must be between 1 and 50"
        )
        .optional()
    })
  });