import { z } from "zod";
const currencies = [
  "USD",
  "EUR",
  "GBP",
  "PKR",
  "AED",
  "SAR",
  "INR",
  "CAD",
  "AUD",
  "JPY",
  "CNY",
  "QAR",
  "KWD",
  "BHD",
  "OMR",
];
export const updateBusinessSchema = z.object({
  body: z
    .object({
      name: z.string().trim().min(2).max(100).optional(),
      country: z.string().trim().max(100).optional().nullable(),
      currency: z
        .string()
        .trim()
        .length(3)
        .transform((v) => v.toUpperCase())
        .refine((v) => currencies.includes(v), "Unsupported currency")
        .optional(),
      timezone: z.string().trim().min(1).max(100).optional(),
    })
    .refine(
      (v) => Object.keys(v).length > 0,
      "At least one setting is required",
    ),
});
