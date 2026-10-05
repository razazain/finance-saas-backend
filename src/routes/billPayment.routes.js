import express from "express";

import {
  create,
  list,
  getOne,
  reverse,
} from "../controllers/billPayment.controller.js";

import { authenticate } from "../middleware/auth.middleware.js";

import { authorize } from "../middleware/authorize.middleware.js";

import { validate } from "../middleware/validate.middleware.js";
import { idempotency } from "../middleware/idempotency.middleware.js";

import {
  createBillPaymentSchema,
  billPaymentIdSchema,
} from "../validators/billPayment.validator.js";

const router = express.Router();

/*
 * Record payment for a bill.
 */
router.post(
  "/bills/:id/payments",
  authenticate,
  authorize("owner", "admin", "employee"),
  validate(createBillPaymentSchema),
  idempotency,
  create,
);

/*
 * Get all payments for a bill.
 */
router.get(
  "/bills/:id/payments",
  authenticate,
  authorize("owner", "admin", "employee"),
  validate(billPaymentIdSchema),
  list,
);

/*
 * Get one payment.
 */
router.get(
  "/bill-payments/:id",
  authenticate,
  authorize("owner", "admin", "employee"),
  validate(billPaymentIdSchema),
  getOne,
);

router.post(
  "/bill-payments/:id/reverse",
  authenticate,
  authorize("owner", "admin"),
  validate(billPaymentIdSchema),
  reverse,
);
export default router;
