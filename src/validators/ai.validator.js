import { z } from "zod";

const id = z.string().regex(/^[a-f\d]{24}$/i, "Invalid ID");
const dateTime = z.string().datetime({ offset: true });

export const aiAssistantSchema = z.object({
  body: z.object({
    question: z.string().trim().min(5).max(3000),
  }),
});

export const aiTransactionDraftSchema = z.object({
  body: z.object({
    text: z.string().trim().min(5).max(2000),
  }),
});

export const aiCategorizeSchema = z.object({
  body: z.object({
    type: z.enum(["income", "expense"]),
    description: z.string().trim().min(2).max(1000),
    amount: z.string().regex(/^\d+(\.\d{1,4})?$/).optional(),
  }),
});

export const aiReportSummarySchema = z.object({
  body: z.object({
    from: dateTime,
    to: dateTime,
  }).refine((value) => new Date(value.from) <= new Date(value.to), {
    message: "from must be before or equal to to",
    path: ["from"],
  }),
});

export const aiPaymentReminderSchema = z.object({
  body: z.object({
    documentType: z.enum(["invoice", "bill"]),
    documentId: id,
    tone: z.enum(["friendly", "formal", "firm"]).default("formal"),
    language: z.enum(["English", "Urdu", "Roman Urdu"]).default("English"),
  }),
});

export const aiAnomalyReviewSchema = z.object({
  body: z.object({
    days: z.coerce.number().int().min(7).max(180).default(90),
  }).default({ days: 90 }),
});

export const aiDocumentIdSchema = z.object({
  params: z.object({ id }),
});
