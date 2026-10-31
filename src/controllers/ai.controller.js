import { asyncHandler } from "../utils/asyncHandler.js";
import { successResponse } from "../utils/response.js";
import {
  getAIStatus,
  askFinanceAssistant,
  createTransactionDraft,
  categorizeTransaction,
  summarizeFinancialReport,
  draftPaymentReminder,
  generateInventoryAdvice,
  reviewTransactionsForAnomalies,
} from "../services/ai.service.js";
import { extractDocumentWithAi } from "../services/document.service.js";

export const status = asyncHandler(async (req, res) =>
  successResponse({
    res,
    message: "AI configuration retrieved",
    data: getAIStatus(),
  }),
);

export const assistant = asyncHandler(async (req, res) => {
  const result = await askFinanceAssistant({
    businessId: req.user.businessId,
    ...req.validated.body,
  });
  return successResponse({
    res,
    message: "Finance assistant response generated",
    data: result,
  });
});

export const transactionDraft = asyncHandler(async (req, res) => {
  const result = await createTransactionDraft({
    businessId: req.user.businessId,
    ...req.validated.body,
  });
  return successResponse({
    res,
    message: "Transaction draft generated for review",
    data: result,
  });
});

export const categorize = asyncHandler(async (req, res) => {
  const result = await categorizeTransaction({
    businessId: req.user.businessId,
    ...req.validated.body,
  });
  return successResponse({
    res,
    message: "Transaction category suggested",
    data: result,
  });
});

export const reportSummary = asyncHandler(async (req, res) => {
  const result = await summarizeFinancialReport({
    businessId: req.user.businessId,
    ...req.validated.body,
  });
  return successResponse({
    res,
    message: "Financial report summary generated",
    data: result,
  });
});

export const paymentReminder = asyncHandler(async (req, res) => {
  const result = await draftPaymentReminder({
    businessId: req.user.businessId,
    ...req.validated.body,
  });
  return successResponse({
    res,
    message: "Payment reminder draft generated",
    data: result,
  });
});

export const inventoryAdvice = asyncHandler(async (req, res) => {
  const result = await generateInventoryAdvice({
    businessId: req.user.businessId,
  });
  return successResponse({
    res,
    message: "Inventory advice generated",
    data: result,
  });
});

export const anomalyReview = asyncHandler(async (req, res) => {
  const result = await reviewTransactionsForAnomalies({
    businessId: req.user.businessId,
    ...req.validated.body,
  });
  return successResponse({
    res,
    message: "Transaction review completed",
    data: result,
  });
});

export const documentExtraction = asyncHandler(async (req, res) => {
  const result = await extractDocumentWithAi({
    businessId: req.user.businessId,
    documentId: req.validated.params.id,
  });
  return successResponse({
    res,
    message: "AI document extraction completed",
    data: result,
  });
});
