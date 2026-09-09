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
      "Value must be a valid positive decimal number"
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
          "Value must be greater than 0"
      }
    );

/*
 * Zero is allowed.
 *
 * Used for discount and tax.
 */
const nonNegativeDecimalSchema =
  z
    .string()
    .trim()
    .regex(
      /^\d+(\.\d{1,4})?$/,
      "Value must be a valid decimal number"
    );

const dateSchema =
  z
    .string()
    .datetime({
      offset: true
    });

const itemSchema =
  z.object({
    description:
      z
        .string()
        .trim()
        .min(
          1,
          "Item description is required"
        )
        .max(
          500,
          "Item description cannot exceed 500 characters"
        ),

    quantity:
      decimalSchema,

    unitPrice:
      decimalSchema,

    /*
     * Expense category.
     */
    categoryId:
      objectIdSchema.optional()
  });

/*
 * CREATE BILL
 */
export const createBillSchema =
  z.object({
    body: z.object({
      vendorId:
        objectIdSchema,

      billDate:
        dateSchema,

      dueDate:
        dateSchema,

      items:
        z
          .array(itemSchema)
          .min(
            1,
            "Bill must contain at least one item"
          )
          .max(
            100,
            "Bill cannot contain more than 100 items"
          ),

      discountRate:
        nonNegativeDecimalSchema
          .default("0"),

      taxRate:
        nonNegativeDecimalSchema
          .default("0"),

      notes:
        z
          .string()
          .trim()
          .max(
            2000,
            "Notes cannot exceed 2000 characters"
          )
          .optional(),

      terms:
        z
          .string()
          .trim()
          .max(
            2000,
            "Terms cannot exceed 2000 characters"
          )
          .optional()
    })
  });

/*
 * LIST BILLS
 */
export const listBillSchema =
  z.object({
    query: z.object({
      vendorId:
        objectIdSchema.optional(),

      status:
        z
          .enum([
            "draft",
            "received",
            "partially_paid",
            "paid",
            "cancelled"
          ])
          .optional(),

      from:
        dateSchema.optional(),

      to:
        dateSchema.optional(),

      page:
        z
          .string()
          .regex(/^\d+$/)
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
          .regex(/^\d+$/)
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
 * BILL ID
 */
export const billIdSchema =
  z.object({
    params: z.object({
      id:
        objectIdSchema
    })
  });

/*
 * UPDATE DRAFT BILL
 */
export const updateBillSchema =
  z.object({
    params: z.object({
      id:
        objectIdSchema
    }),

    body: z.object({
      vendorId:
        objectIdSchema.optional(),

      billDate:
        dateSchema.optional(),

      dueDate:
        dateSchema.optional(),

      items:
        z
          .array(itemSchema)
          .min(
            1,
            "Bill must contain at least one item"
          )
          .max(
            100,
            "Bill cannot contain more than 100 items"
          )
          .optional(),

      discountRate:
        nonNegativeDecimalSchema
          .optional(),

      taxRate:
        nonNegativeDecimalSchema
          .optional(),

      notes:
        z
          .string()
          .trim()
          .max(2000)
          .nullable()
          .optional(),

      terms:
        z
          .string()
          .trim()
          .max(2000)
          .nullable()
          .optional()
    })
  });

/*
 * SEND / CANCEL BILL
 */
export const updateBillStatusSchema =
  z.object({
    params: z.object({
      id:
        objectIdSchema
    }),

    body: z.object({
      status:
        z.enum([
          "received",
          "cancelled"
        ])
    })
  });