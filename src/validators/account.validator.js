import { z } from "zod";

const objectIdSchema = z
  .string()
  .regex(
    /^[a-f\d]{24}$/i,
    "Invalid account ID"
  );

const moneySchema = z
  .string()
  .trim()
  .regex(
    /^\d+(\.\d{1,4})?$/,
    "Amount must be a valid positive decimal number"
  )
  .refine(
    (value) => {
      const amount =
        Number(value);

      return (
        Number.isFinite(amount) &&
        amount >= 0
      );
    },
    {
      message:
        "Amount must be greater than or equal to 0"
    }
  );

export const createAccountSchema =
  z.object({
    body: z.object({
      name: z
        .string()
        .trim()
        .min(
          2,
          "Account name must be at least 2 characters"
        )
        .max(
          100,
          "Account name cannot exceed 100 characters"
        ),

      type: z.enum(
        [
          "cash",
          "bank",
          "wallet",
          "other"
        ],
        {
          message:
            "Account type must be cash, bank, wallet or other"
        }
      ),

      description: z
        .string()
        .trim()
        .max(
          500,
          "Description cannot exceed 500 characters"
        )
        .optional(),

      /*
       * Optional.
       *
       * If omitted, the business currency
       * will be used.
       */
      currency: z
        .string()
        .trim()
        .toUpperCase()
        .regex(
          /^[A-Z]{3}$/,
          "Currency must be a valid 3-letter currency code"
        )
        .optional(),

      openingBalance:
        moneySchema.optional()
    })
  });

export const listAccountSchema =
  z.object({
    query: z.object({
      type: z
        .enum([
          "cash",
          "bank",
          "wallet",
          "other"
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

export const accountIdSchema =
  z.object({
    params: z.object({
      id: objectIdSchema
    })
  });

export const updateAccountSchema =
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
          "Account name must be at least 2 characters"
        )
        .max(
          100,
          "Account name cannot exceed 100 characters"
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

export const updateAccountStatusSchema =
  z.object({
    params: z.object({
      id: objectIdSchema
    }),

    body: z.object({
      isActive: z.boolean()
    })
  });