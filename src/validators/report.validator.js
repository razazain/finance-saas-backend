import { z } from "zod";

const dateTimeSchema =
  z
    .string()
    .datetime({
      offset: true
    });

const objectIdSchema =
  z
    .string()
    .regex(
      /^[a-f\d]{24}$/i,
      "Invalid ID"
    );

export const reportDateRangeSchema =
  z.object({
    query: z.object({
      from:
        dateTimeSchema.optional(),

      to:
        dateTimeSchema.optional()
    })
  });

export const reportCategoryBreakdownSchema =
  z.object({
    query: z.object({
      from:
        dateTimeSchema.optional(),

      to:
        dateTimeSchema.optional(),

      type:
        z
          .enum([
            "income",
            "expense"
          ])
          .optional(),

      categoryId:
        objectIdSchema.optional()
    })
  });

export const reportAccountSummarySchema =
  z.object({
    query: z.object({
      from:
        dateTimeSchema.optional(),

      to:
        dateTimeSchema.optional(),

      accountId:
        objectIdSchema.optional()
    })
  });