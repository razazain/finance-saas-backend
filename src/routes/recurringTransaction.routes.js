import express from "express";

import {
  create,
  list,
  getOne,
  updateStatus,
  execute
} from "../controllers/recurringTransaction.controller.js";

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
  createRecurringTransactionSchema,
  listRecurringTransactionSchema,
  recurringTransactionIdSchema,
  recurringTransactionStatusSchema
} from "../validators/recurringTransaction.validator.js";

const router =
  express.Router();

/*
 * Create recurring rule.
 */
router.post(
  "/",
  authenticate,

  authorize(
    "owner",
    "admin",
    "employee"
  ),

  validate(
    createRecurringTransactionSchema
  ),

  create
);

/*
 * List recurring rules.
 */
router.get(
  "/",
  authenticate,

  authorize(
    "owner",
    "admin",
    "employee"
  ),

  validate(
    listRecurringTransactionSchema
  ),

  list
);

/*
 * Get one recurring rule.
 */
router.get(
  "/:id",
  authenticate,

  authorize(
    "owner",
    "admin",
    "employee"
  ),

  validate(
    recurringTransactionIdSchema
  ),

  getOne
);

/*
 * Pause / resume.
 *
 * This is an administrative action,
 * so owner/admin only.
 */
router.patch(
  "/:id/status",
  authenticate,

  authorize(
    "owner",
    "admin"
  ),

  validate(
    recurringTransactionStatusSchema
  ),

  updateStatus
);

/*
 * Manually execute a recurring rule.
 *
 * Employees can execute it.
 */
router.post(
  "/:id/execute",
  authenticate,

  authorize(
    "owner",
    "admin",
    "employee"
  ),

  validate(
    recurringTransactionIdSchema
  ),

  execute
);

export default router;