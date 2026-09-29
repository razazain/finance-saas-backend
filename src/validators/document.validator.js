import { z } from "zod";

const objectIdSchema = z.string().regex(/^[a-f\d]{24}$/i, "Invalid ID");
const dateSchema = z.string().datetime({ offset: true });
const decimalSchema = z
  .string()
  .trim()
  .regex(/^\d+(\.\d{1,4})?$/, "Invalid decimal amount");

export const initDocumentUploadSchema = z.object({
  body: z.object({
    originalFileName: z.string().trim().min(1).max(255),
    mimeType: z.enum([
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/webp",
    ]),
    fileSize: z
      .number()
      .int()
      .positive()
      .max(15 * 1024 * 1024),
    documentType: z
      .enum([
        "invoice",
        "bill",
        "receipt",
        "expense_receipt",
        "income_receipt",
        "statement",
        "other",
      ])
      .optional(),
  }),
});

export const completeDocumentUploadSchema = z.object({
  params: z.object({ id: objectIdSchema }),
  body: z.object({
    publicId: z.string().trim().min(1).max(500),
    secureUrl: z.string().url().max(2000),
    resourceType: z.enum(["image", "raw", "video"]),
    format: z.string().trim().max(20).optional().nullable(),
  }),
});

export const documentIdSchema = z.object({
  params: z.object({ id: objectIdSchema }),
});

export const listDocumentSchema = z.object({
  query: z.object({
    processingStatus: z
      .enum(["uploading", "uploaded", "processing", "processed", "failed"])
      .optional(),
    documentType: z
      .enum([
        "invoice",
        "bill",
        "receipt",
        "expense_receipt",
        "income_receipt",
        "statement",
        "other",
      ])
      .optional(),
    page: z
      .string()
      .regex(/^\d+$/)
      .transform(Number)
      .refine((v) => v >= 1)
      .optional(),
    limit: z
      .string()
      .regex(/^\d+$/)
      .transform(Number)
      .refine((v) => v >= 1 && v <= 100)
      .optional(),
  }),
});

export const convertDocumentSchema = z.object({
  params: z.object({ id: objectIdSchema }),
  body: z.discriminatedUnion("targetType", [
    z.object({
      targetType: z.literal("invoice"),
      customerId: objectIdSchema,
      issueDate: dateSchema.optional(),
      dueDate: dateSchema.optional(),
      categoryId: objectIdSchema.optional(),
      amount: decimalSchema.optional(),
      description: z.string().trim().max(500).optional(),
    }),
    z.object({
      targetType: z.literal("bill"),
      vendorId: objectIdSchema,
      billDate: dateSchema.optional(),
      dueDate: dateSchema.optional(),
      categoryId: objectIdSchema.optional(),
      amount: decimalSchema.optional(),
      description: z.string().trim().max(500).optional(),
    }),
    z.object({
      targetType: z.literal("transaction"),
      type: z.enum(["income", "expense"]),
      accountId: objectIdSchema,
      categoryId: objectIdSchema,
      transactionDate: dateSchema.optional(),
      amount: decimalSchema.optional(),
      description: z.string().trim().max(1000).optional(),
      reference: z.string().trim().max(100).optional(),
    }),
  ]),
});
