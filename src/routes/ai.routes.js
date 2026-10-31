import express from "express";
import rateLimit from "express-rate-limit";
import { authenticate } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/authorize.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import {
  aiAssistantSchema,
  aiTransactionDraftSchema,
  aiCategorizeSchema,
  aiReportSummarySchema,
  aiPaymentReminderSchema,
  aiAnomalyReviewSchema,
  aiDocumentIdSchema,
} from "../validators/ai.validator.js";
import {
  status,
  assistant,
  transactionDraft,
  categorize,
  reportSummary,
  paymentReminder,
  inventoryAdvice,
  anomalyReview,
  documentExtraction,
} from "../controllers/ai.controller.js";

const router = express.Router();
const staff = ["owner", "admin", "employee"];

router.use(authenticate, authorize(...staff));
router.use((req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  next();
});

// Per-user throttle protects the provider's shared free-tier quota.
const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  keyGenerator: (req) => req.user.userId,
  message: {
    success: false,
    code: "AI_REQUEST_LIMIT_EXCEEDED",
    message: "AI request limit reached. Please try again later.",
  },
});
router.use(aiLimiter);

router.get("/status", status);
router.post("/assistant", validate(aiAssistantSchema), assistant);
router.post("/transactions/draft", validate(aiTransactionDraftSchema), transactionDraft);
router.post("/transactions/categorize", validate(aiCategorizeSchema), categorize);
router.post("/reports/summary", validate(aiReportSummarySchema), reportSummary);
router.post("/collections/payment-reminder", validate(aiPaymentReminderSchema), paymentReminder);
router.post("/inventory/reorder-advice", inventoryAdvice);
router.post("/transactions/anomaly-review", validate(aiAnomalyReviewSchema), anomalyReview);
router.post("/documents/:id/extract", validate(aiDocumentIdSchema), documentExtraction);

export default router;
