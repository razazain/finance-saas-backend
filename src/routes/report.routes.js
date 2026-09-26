import express from "express";

import {
  incomeExpense,
  cashFlow,
  categoryBreakdown,
  monthlySummary,
  accountSummary
} from "../controllers/report.controller.js";

import {
  authenticate
} from "../middleware/auth.middleware.js";

import {
  authorize
} from "../middleware/authorize.middleware.js";

import {
  validate
} from "../middleware/validate.middleware.js";

import {
  reportDateRangeSchema,
  reportCategoryBreakdownSchema,
  reportAccountSummarySchema
} from "../validators/report.validator.js";

const router =
  express.Router();

const reportRoles = [
  "owner",
  "admin",
  "employee"
];

router.get(
  "/income-expense",
  authenticate,
  authorize(
    ...reportRoles
  ),
  validate(
    reportDateRangeSchema
  ),
  incomeExpense
);

router.get(
  "/cash-flow",
  authenticate,
  authorize(
    ...reportRoles
  ),
  validate(
    reportDateRangeSchema
  ),
  cashFlow
);

router.get(
  "/category-breakdown",
  authenticate,
  authorize(
    ...reportRoles
  ),
  validate(
    reportCategoryBreakdownSchema
  ),
  categoryBreakdown
);

router.get(
  "/monthly-summary",
  authenticate,
  authorize(
    ...reportRoles
  ),
  validate(
    reportDateRangeSchema
  ),
  monthlySummary
);

router.get(
  "/account-summary",
  authenticate,
  authorize(
    ...reportRoles
  ),
  validate(
    reportAccountSummarySchema
  ),
  accountSummary
);

export default router;