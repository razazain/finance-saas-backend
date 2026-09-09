import { z } from "zod";

const objectIdSchema =
  z
    .string()
    .regex(
      /^[a-f\d]{24}$/i,
      "Invalid ID"
    );

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
        ![
          "0",
          "0.0",
          "0.00",
          "0.000",
          "0.0000"
        ].includes(value),
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

/*
 * CREATE BILL PAYMENT
 */
export const createBillPaymentSchema =
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

/*
 * BILL PAYMENT ID
 */
export const billPaymentIdSchema =
  z.object({
    params: z.object({
      id:
        objectIdSchema
    })
  });