import { z } from "zod";
const id = z.string().regex(/^[a-f\d]{24}$/i, "Invalid ID");
const dec = z.string().regex(/^\d+(\.\d{1,4})?$/, "Invalid decimal");
export const planSchema = z.object({
  body: z.object({ plan: z.enum(["free", "starter", "pro", "business"]) }),
});
export const inventoryCreateSchema = z.object({
  body: z.object({
    sku: z.string().trim().min(1).max(80),
    name: z.string().trim().min(1).max(200),
    description: z.string().max(1000).optional().nullable(),
    unit: z.string().max(30).optional(),
    quantity: dec.optional(),
    reorderLevel: dec.optional(),
    unitCost: dec.optional(),
  }),
});
export const inventoryAdjustSchema = z.object({
  params: z.object({ id }),
  body: z.object({
    quantity: z.string().regex(/^-?\d+(\.\d{1,4})?$/),
    type: z.enum(["purchase", "sale", "adjustment", "return"]).optional(),
    unitCost: dec.optional(),
    reference: z.string().max(100).optional().nullable(),
    notes: z.string().max(1000).optional().nullable(),
  }),
});
export const currencyRateSchema = z.object({
  body: z.object({
    baseCurrency: z
      .string()
      .length(3)
      .transform((v) => v.toUpperCase()),
    quoteCurrency: z
      .string()
      .length(3)
      .transform((v) => v.toUpperCase()),
    rate: dec.refine((v) => Number(v) > 0),
    effectiveAt: z.string().datetime({ offset: true }).optional(),
    source: z.string().max(50).optional(),
  }),
});
export const currencyConvertSchema = z.object({
  body: z.object({
    from: z.string().length(3),
    to: z.string().length(3),
    amount: dec,
    at: z.string().datetime({ offset: true }).optional(),
  }),
});
export const objectIdParamSchema = z.object({ params: z.object({ id }) });
