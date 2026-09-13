import { z } from "zod";

const objectIdSchema =
  z
    .string()
    .regex(
      /^[a-f\d]{24}$/i,
      "Invalid ID"
    );

/*
 * Keep amounts as strings.
 *
 * This avoids JavaScript floating-point
 * values entering financial calculations.
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

const dateSchema =
  z
    .string()
    .datetime({
      offset: true
    });

const commonFields = {
  amount:
    amountSchema,

  description:
    z
      .string()
      .trim()
      .max(
        1000,
        "Description cannot exceed 1000 characters"
      )
      .optional(),

  reference:
    z
      .string()
      .trim()
      .max(
        100,
        "Reference cannot exceed 100 characters"
      )
      .optional(),

  frequency:
    z.enum([
      "daily",
      "weekly",
      "monthly",
      "yearly",
      "custom"
    ]),

  intervalDays:
    z
      .number()
      .int()
      .min(1)
      .max(3650)
      .optional(),

  startDate:
    dateSchema,

  endDate:
    dateSchema
      .nullable()
      .optional()
};

/*
 * CREATE recurring transaction.
 *
 * Discriminated union ensures the
 * correct account/category fields
 * are supplied for each transaction type.
 */
export const createRecurringTransactionSchema =
  z.object({
    body:
      z.discriminatedUnion(
        "type",
        [
          /*
           * INCOME
           */
          z.object({
            type:
              z.literal(
                "income"
              ),

            accountId:
              objectIdSchema,

            categoryId:
              objectIdSchema,

            ...commonFields
          }),

          /*
           * EXPENSE
           */
          z.object({
            type:
              z.literal(
                "expense"
              ),

            accountId:
              objectIdSchema,

            categoryId:
              objectIdSchema,

            ...commonFields
          }),

          /*
           * TRANSFER
           */
          z.object({
            type:
              z.literal(
                "transfer"
              ),

            accountId:
              objectIdSchema,

            destinationAccountId:
              objectIdSchema,

            ...commonFields
          })
        ]
      )
  });

/*
 * LIST
 */
export const listRecurringTransactionSchema =
  z.object({
    query: z.object({
      type:
        z
          .enum([
            "income",
            "expense",
            "transfer"
          ])
          .optional(),

      isActive:
        z
          .enum([
            "true",
            "false"
          ])
          .transform(
            (value) =>
              value === "true"
          )
          .optional(),

      page:
        z
          .string()
          .regex(
            /^\d+$/
          )
          .transform(Number)
          .refine(
            (value) =>
              value >= 1,
            "Page must be at least 1"
          )
          .optional(),

      limit:
        z
          .string()
          .regex(
            /^\d+$/
          )
          .transform(Number)
          .refine(
            (value) =>
              value >= 1 &&
              value <= 100,
            "Limit must be between 1 and 100"
          )
          .optional()
    })
  });

/*
 * ID
 */
export const recurringTransactionIdSchema =
  z.object({
    params: z.object({
      id:
        objectIdSchema
    })
  });

/*
 * Pause / resume.
 */
export const recurringTransactionStatusSchema =
  z.object({
    params: z.object({
      id:
        objectIdSchema
    }),

    body: z.object({
      isActive:
        z.boolean()
    })
  });