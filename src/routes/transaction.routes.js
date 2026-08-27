import express from "express";

import {
  create,
  list,
  getOne,
  voidOne
} from "../controllers/transaction.controller.js";

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
  createTransactionSchema,
  listTransactionSchema,
  transactionIdSchema,
  voidTransactionSchema
} from "../validators/transaction.validator.js";

const router =
  express.Router();

/*
 * Create transaction.
 *
 * Owner, admin and employee.
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
    createTransactionSchema
  ),
  create
);

/*
 * List transactions.
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
    listTransactionSchema
  ),
  list
);

/*
 * Get transaction.
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
    transactionIdSchema
  ),
  getOne
);

/*
 * Void transaction.
 *
 * Employees cannot void financial
 * transactions.
 */
router.patch(
  "/:id/void",
  authenticate,
  authorize(
    "owner",
    "admin"
  ),
  validate(
    voidTransactionSchema
  ),
  voidOne
);

export default router;