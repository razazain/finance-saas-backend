import express from "express";

import {
  create,
  list,
  getOne,
  voidOne,
} from "../controllers/transaction.controller.js";

import { authenticate } from "../middleware/auth.middleware.js";

import { authorize } from "../middleware/authorize.middleware.js";

import { validate } from "../middleware/validate.middleware.js";
import { idempotency } from "../middleware/idempotency.middleware.js";

import {
  createTransactionSchema,
  listTransactionSchema,
  transactionIdSchema,
  voidTransactionSchema,
} from "../validators/transaction.validator.js";

const router = express.Router();

router.post(
  "/",
  authenticate,
  authorize("owner", "admin", "employee"),
  validate(createTransactionSchema),
  idempotency,
  create,
);

router.get(
  "/",
  authenticate,
  authorize("owner", "admin", "employee"),
  validate(listTransactionSchema),
  list,
);

router.get(
  "/:id",
  authenticate,
  authorize("owner", "admin", "employee"),
  validate(transactionIdSchema),
  getOne,
);

router.patch(
  "/:id/void",
  authenticate,
  authorize("owner", "admin"),
  validate(voidTransactionSchema),
  voidOne,
);

export default router;
