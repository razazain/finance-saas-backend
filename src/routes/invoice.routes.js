import express from "express";

import {
  create,
  list,
  getOne,
  update,
  updateStatus,
} from "../controllers/invoice.controller.js";

import { authenticate } from "../middleware/auth.middleware.js";

import { authorize } from "../middleware/authorize.middleware.js";

import { validate } from "../middleware/validate.middleware.js";

import {
  createInvoiceSchema,
  listInvoiceSchema,
  invoiceIdSchema,
  updateInvoiceSchema,
  updateInvoiceStatusSchema,
} from "../validators/invoice.validator.js";

const router = express.Router();

router.post(
  "/",
  authenticate,
  authorize("owner", "admin", "employee"),
  validate(createInvoiceSchema),
  create,
);

router.get(
  "/",
  authenticate,
  authorize("owner", "admin", "employee"),
  validate(listInvoiceSchema),
  list,
);

router.get(
  "/:id",
  authenticate,
  authorize("owner", "admin", "employee"),
  validate(invoiceIdSchema),
  getOne,
);

router.patch(
  "/:id",
  authenticate,
  authorize("owner", "admin", "employee"),
  validate(updateInvoiceSchema),
  update,
);

router.patch(
  "/:id/status",
  authenticate,
  authorize("owner", "admin"),
  validate(updateInvoiceStatusSchema),
  updateStatus,
);

export default router;
