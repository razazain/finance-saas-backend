import express from "express";

import {
  create,
  list,
  getOne,
  update,
  updateStatus
} from "../controllers/bill.controller.js";

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
  createBillSchema,
  listBillSchema,
  billIdSchema,
  updateBillSchema,
  updateBillStatusSchema
} from "../validators/bill.validator.js";

const router =
  express.Router();

/*
 * Create bill.
 *
 * Employees can create bills.
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
    createBillSchema
  ),
  create
);

/*
 * List bills.
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
    listBillSchema
  ),
  list
);

/*
 * Get single bill.
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
    billIdSchema
  ),
  getOne
);

/*
 * Update draft bill.
 */
router.patch(
  "/:id",
  authenticate,
  authorize(
    "owner",
    "admin",
    "employee"
  ),
  validate(
    updateBillSchema
  ),
  update
);

/*
 * Mark received / cancel.
 *
 * Same permission model as invoices:
 * employees cannot change lifecycle status.
 */
router.patch(
  "/:id/status",
  authenticate,
  authorize(
    "owner",
    "admin"
  ),
  validate(
    updateBillStatusSchema
  ),
  updateStatus
);

export default router;