import { z } from "zod";

const objectIdSchema =
  z
    .string()
    .regex(
      /^[a-f\d]{24}$/i,
      "Invalid ID"
    );

/*
 * Financial input stays as a string.
 *
 * No JavaScript Number is used here.
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
        value !== "0" &&
        value !== "0.0" &&
        value !== "0.00" &&
        value !== "0.000" &&
        value !== "0.0000",
      {
        message:
          "Value must be greater than 0"
      }
    );

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
    description: z
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
      nonNegativeDecimalSchema
        .refine(
          (value) =>
            value !== "0" &&
            value !== "0.0" &&
            value !== "0.00" &&
            value !== "0.000" &&
            value !== "0.0000",
          {
            message:
              "Unit price must be greater than 0"
          }
        ),

    categoryId:
      objectIdSchema.optional()
  });

export const createInvoiceSchema =
  z.object({
    body: z.object({
      customerId:
        objectIdSchema,

      issueDate:
        dateSchema,

      dueDate:
        dateSchema,

      items: z
        .array(itemSchema)
        .min(
          1,
          "Invoice must contain at least one item"
        )
        .max(
          100,
          "Invoice cannot contain more than 100 items"
        ),

      discountRate:
        nonNegativeDecimalSchema
          .default("0"),

      taxRate:
        nonNegativeDecimalSchema
          .default("0"),

      notes: z
        .string()
        .trim()
        .max(
          2000,
          "Notes cannot exceed 2000 characters"
        )
        .optional(),

      terms: z
        .string()
        .trim()
        .max(
          2000,
          "Terms cannot exceed 2000 characters"
        )
        .optional()
    })
  });

export const listInvoiceSchema =
  z.object({
    query: z.object({
      customerId:
        objectIdSchema.optional(),

      status: z
        .enum([
          "draft",
          "sent",
          "partially_paid",
          "paid",
          "cancelled"
        ])
        .optional(),

      from:
        dateSchema.optional(),

      to:
        dateSchema.optional(),

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

export const invoiceIdSchema =
  z.object({
    params: z.object({
      id:
        objectIdSchema
    })
  });

export const updateInvoiceSchema =
  z.object({
    params: z.object({
      id:
        objectIdSchema
    }),

    body: z.object({
      customerId:
        objectIdSchema.optional(),

      issueDate:
        dateSchema.optional(),

      dueDate:
        dateSchema.optional(),

      items:
        z
          .array(itemSchema)
          .min(
            1,
            "Invoice must contain at least one item"
          )
          .max(
            100,
            "Invoice cannot contain more than 100 items"
          )
          .optional(),

      discountRate:
        nonNegativeDecimalSchema
          .optional(),

      taxRate:
        nonNegativeDecimalSchema
          .optional(),

      notes: z
        .string()
        .trim()
        .max(
          2000
        )
        .nullable()
        .optional(),

      terms: z
        .string()
        .trim()
        .max(
          2000
        )
        .nullable()
        .optional()
    })
  });

export const updateInvoiceStatusSchema =
  z.object({
    params: z.object({
      id:
        objectIdSchema
    }),

    body: z.object({
      status: z.enum([
        "sent",
        "cancelled"
      ])
    })
  });