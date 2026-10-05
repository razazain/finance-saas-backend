import express from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import {
  planSchema,
  inventoryCreateSchema,
  inventoryAdjustSchema,
  currencyRateSchema,
  currencyConvertSchema,
  objectIdParamSchema,
} from "../validators/mvp.validator.js";
import { authorize } from "../middleware/authorize.middleware.js";
import {
  exportTransactions,
  exportTransactionsPdf,
  invoicePdf,
  billPdf,
  emailInvoice,
  emailBill,
  notifications,
  markNotificationRead,
  getSubscription,
  updateSubscription,
  listInventory,
  createInventory,
  adjustInventory,
  taxReport,
  createCurrencyRate,
  listCurrencyRates,
  convertCurrency,
  aiInsights,
  auditLogs,
} from "../controllers/mvp.controller.js";
const router = express.Router();
const staff = ["owner", "admin", "employee"];
router.get(
  "/exports/transactions.csv",
  authenticate,
  authorize(...staff),
  exportTransactions,
);
router.get(
  "/exports/transactions.pdf",
  authenticate,
  authorize(...staff),
  exportTransactionsPdf,
);
router.get(
  "/invoices/:id/pdf",
  authenticate,
  authorize(...staff),
  validate(objectIdParamSchema),
  invoicePdf,
);
router.get(
  "/bills/:id/pdf",
  authenticate,
  authorize(...staff),
  validate(objectIdParamSchema),
  billPdf,
);
router.post(
  "/invoices/:id/email",
  authenticate,
  authorize("owner", "admin"),
  validate(objectIdParamSchema),
  emailInvoice,
);
router.post(
  "/bills/:id/email",
  authenticate,
  authorize("owner", "admin"),
  validate(objectIdParamSchema),
  emailBill,
);
router.get("/audit-logs", authenticate, authorize("owner", "admin"), auditLogs);
router.get("/notifications", authenticate, authorize(...staff), notifications);
router.patch(
  "/notifications/:id/read",
  authenticate,
  authorize(...staff),
  validate(objectIdParamSchema),
  markNotificationRead,
);
router.get(
  "/subscription",
  authenticate,
  authorize("owner", "admin"),
  getSubscription,
);
router.patch(
  "/subscription",
  authenticate,
  authorize("owner"),
  validate(planSchema),
  updateSubscription,
);
router.get("/inventory", authenticate, authorize(...staff), listInventory);
router.post(
  "/inventory",
  authenticate,
  authorize("owner", "admin"),
  validate(inventoryCreateSchema),
  createInventory,
);
router.patch(
  "/inventory/:id/adjust",
  authenticate,
  authorize("owner", "admin", "employee"),
  validate(inventoryAdjustSchema),
  adjustInventory,
);
router.get("/reports/tax", authenticate, authorize(...staff), taxReport);
router.get(
  "/currency-rates",
  authenticate,
  authorize(...staff),
  listCurrencyRates,
);
router.post(
  "/currency-rates",
  authenticate,
  authorize("owner", "admin"),
  validate(currencyRateSchema),
  createCurrencyRate,
);
router.post(
  "/currency-rates/convert",
  authenticate,
  authorize(...staff),
  validate(currencyConvertSchema),
  convertCurrency,
);
router.get("/insights", authenticate, authorize(...staff), aiInsights);
export default router;
