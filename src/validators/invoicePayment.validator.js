import { z } from "zod";

const objectIdSchema =
  z
    .string()
    .regex(
      /^[a-f\d]{24}$/i,
      "Invalid ID"
    );

/*
 * Positive decimal.
 *
 * Maximum 4 decimal places.
 */
const decimalSchema =
  z
    .string()
    .trim()
    .regex(
      /^\d+(\.\d{1,4})?$/,
      "Amount must be a valid decimal number"
    )
    .refine(
      (value) =>
        value !== "0" &&
        value !== "0.0" &&
        value !== "0.00" &&
        value !== "0.000" &&
        value !== "0.0000",
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

export const createInvoicePaymentSchema =
  z.object({
    params: z.object({
      id:
        objectIdSchema
    }),

    body: z.object({
      accountId:
        objectIdSchema,

      categoryId:
        objectIdSchema,

      amount:
        decimalSchema,

      paymentDate:
        dateSchema,

      reference:
        z
          .string()
          .trim()
          .max(100)
          .optional(),

      notes:
        z
          .string()
          .trim()
          .max(1000)
          .optional()
    })
  });

export const invoicePaymentIdSchema =
  z.object({
    params: z.object({
      id:
        objectIdSchema
    })
  });