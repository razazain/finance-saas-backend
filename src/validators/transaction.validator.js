import { z } from "zod";

const objectIdSchema =
  z.string().regex(
    /^[a-f\d]{24}$/i,
    "Invalid ID"
  );

/*
 * Amount is deliberately a string.
 *
 * We do not allow JavaScript floating
 * point numbers to enter the financial
 * calculation layer.
 */
const amountSchema =
  z
    .string()
    .trim()
    .regex(
      /^\d+(\.\d{1,4})?$/,
      "Amount must be a valid positive decimal number"
    )
    .refine(
      (value) => {
        const number =
          Number(value);

        return (
          Number.isFinite(number) &&
          number > 0
        );
      },
      {
        message:
          "Amount must be greater than 0"
      }
    );

const baseFields = {
  amount: amountSchema,

  transactionDate: z
    .string()
    .datetime({
      offset: true
    }),

  description: z
    .string()
    .trim()
    .max(
      1000,
      "Description cannot exceed 1000 characters"
    )
    .optional(),

  reference: z
    .string()
    .trim()
    .max(
      100,
      "Reference cannot exceed 100 characters"
    )
    .optional()
};

export const createTransactionSchema =
  z.object({
    body: z.discriminatedUnion(
      "type",
      [
        /*
         * INCOME
         */
        z.object({
          type: z.literal("income"),

          accountId:
            objectIdSchema,

          categoryId:
            objectIdSchema,

          ...baseFields
        }),

        /*
         * EXPENSE
         */
        z.object({
          type: z.literal("expense"),

          accountId:
            objectIdSchema,

          categoryId:
            objectIdSchema,

          ...baseFields
        }),

        /*
         * TRANSFER
         */
        z.object({
          type:
            z.literal("transfer"),

          accountId:
            objectIdSchema,

          destinationAccountId:
            objectIdSchema,

          ...baseFields
        })
      ]
    )
  });

export const listTransactionSchema =
  z.object({
    query: z.object({
      type: z
        .enum([
          "income",
          "expense",
          "transfer"
        ])
        .optional(),

      status: z
        .enum([
          "posted",
          "voided"
        ])
        .optional(),

      accountId:
        objectIdSchema.optional(),

      categoryId:
        objectIdSchema.optional(),

      from:
        z
          .string()
          .datetime({
            offset: true
          })
          .optional(),

      to:
        z
          .string()
          .datetime({
            offset: true
          })
          .optional(),

      page: z
        .string()
        .regex(
          /^\d+$/
        )
        .transform(
          Number
        )
        .refine(
          (value) =>
            value >= 1,
          "Page must be at least 1"
        )
        .optional(),

      limit: z
        .string()
        .regex(
          /^\d+$/
        )
        .transform(
          Number
        )
        .refine(
          (value) =>
            value >= 1 &&
            value <= 100,
          "Limit must be between 1 and 100"
        )
        .optional()
    })
  });

export const transactionIdSchema =
  z.object({
    params: z.object({
      id: objectIdSchema
    })
  });

export const voidTransactionSchema =
  z.object({
    params: z.object({
      id: objectIdSchema
    }),

    body: z.object({
      reason: z
        .string()
        .trim()
        .min(
          3,
          "Void reason must be at least 3 characters"
        )
        .max(
          500,
          "Void reason cannot exceed 500 characters"
        )
    })
  });