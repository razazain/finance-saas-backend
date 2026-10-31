import express from "express";

import {
  summary,
  cashFlow,
  categoryBreakdown,
  accountBalances,
  recentTransactions,
} from "../controllers/dashboard.controller.js";

import { authenticate } from "../middleware/auth.middleware.js";

import { authorize } from "../middleware/authorize.middleware.js";

import { validate } from "../middleware/validate.middleware.js";

import {
  dashboardDateRangeSchema,
  categoryBreakdownSchema,
  recentTransactionsSchema,
} from "../validators/dashboard.validator.js";

const router = express.Router();

const dashboardRoles = ["owner", "admin", "employee"];

router.get(
  "/summary",
  authenticate,
  authorize(...dashboardRoles),
  validate(dashboardDateRangeSchema),
  summary,
);

router.get(
  "/cash-flow",
  authenticate,
  authorize(...dashboardRoles),
  validate(dashboardDateRangeSchema),
  cashFlow,
);


router.get(
  "/category-breakdown",
  authenticate,
  authorize(...dashboardRoles),
  validate(categoryBreakdownSchema),
  categoryBreakdown,
);

router.get(
  "/account-balances",
  authenticate,
  authorize(...dashboardRoles),
  accountBalances,
);

router.get(
  "/recent-transactions",
  authenticate,
  authorize(...dashboardRoles),
  validate(recentTransactionsSchema),
  recentTransactions,
);

export default router;
