import express from "express";

import {
  create,
  list,
  getOne,
  updateStatus,
  execute,
} from "../controllers/recurringTransaction.controller.js";

import { authenticate } from "../middleware/auth.middleware.js";

import { authorize } from "../middleware/authorize.middleware.js";

import { validate } from "../middleware/validate.middleware.js";
import { idempotency } from "../middleware/idempotency.middleware.js";

import {
  createRecurringTransactionSchema,
  listRecurringTransactionSchema,
  recurringTransactionIdSchema,
  recurringTransactionStatusSchema,
} from "../validators/recurringTransaction.validator.js";

const router = express.Router();

router.post(
  "/",
  authenticate,

  authorize("owner", "admin", "employee"),

  validate(createRecurringTransactionSchema),
  idempotency,

  create,
);

router.get(
  "/",
  authenticate,

  authorize("owner", "admin", "employee"),

  validate(listRecurringTransactionSchema),

  list,
);

router.get(
  "/:id",
  authenticate,

  authorize("owner", "admin", "employee"),

  validate(recurringTransactionIdSchema),

  getOne,
);

router.patch(
  "/:id/status",
  authenticate,

  authorize("owner", "admin"),

  validate(recurringTransactionStatusSchema),

  updateStatus,
);

router.post(
  "/:id/execute",
  authenticate,

  authorize("owner", "admin", "employee"),

  validate(recurringTransactionIdSchema),

  execute,
);

export default router;
