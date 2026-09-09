import express from "express";

import {
  create,
  list,
  getOne
} from "../controllers/invoicePayment.controller.js";

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
  createInvoicePaymentSchema,
  invoicePaymentIdSchema
} from "../validators/invoicePayment.validator.js";

const router =
  express.Router();

/*
 * Record invoice payment.
 *
 * Employees can record payments.
 */
router.post(
  "/invoices/:id/payments",
  authenticate,
  authorize(
    "owner",
    "admin",
    "employee"
  ),
  validate(
    createInvoicePaymentSchema
  ),
  create
);

/*
 * Get all payments for
 * an invoice.
 */
router.get(
  "/invoices/:id/payments",
  authenticate,
  authorize(
    "owner",
    "admin",
    "employee"
  ),
  validate(
    invoicePaymentIdSchema
  ),
  list
);

/*
 * Get single payment.
 */
router.get(
  "/payments/:id",
  authenticate,
  authorize(
    "owner",
    "admin",
    "employee"
  ),
  validate(
    invoicePaymentIdSchema
  ),
  getOne
);

export default router;