import express from "express";

import {
  create,
  list,
  getOne,
  update,
  updateStatus
} from "../controllers/account.controller.js";

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
  createAccountSchema,
  listAccountSchema,
  accountIdSchema,
  updateAccountSchema,
  updateAccountStatusSchema
} from "../validators/account.validator.js";

const router =
  express.Router();

/*
 * Create account
 *
 * Owner and admin.
 */
router.post(
  "/",
  authenticate,
  authorize(
    "owner",
    "admin"
  ),
  validate(
    createAccountSchema
  ),
  create
);

/*
 * List accounts
 *
 * All authenticated business users
 * can view accounts.
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
    listAccountSchema
  ),
  list
);

/*
 * Get account.
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
    accountIdSchema
  ),
  getOne
);

/*
 * Update account metadata.
 */
router.patch(
  "/:id",
  authenticate,
  authorize(
    "owner",
    "admin"
  ),
  validate(
    updateAccountSchema
  ),
  update
);

/*
 * Activate/deactivate account.
 */
router.patch(
  "/:id/status",
  authenticate,
  authorize(
    "owner",
    "admin"
  ),
  validate(
    updateAccountStatusSchema
  ),
  updateStatus
);

export default router;