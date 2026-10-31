import express from "express";

import {
  create,
  list,
  getOne,
  update,
  updateStatus,
} from "../controllers/bill.controller.js";

import { authenticate } from "../middleware/auth.middleware.js";

import { authorize } from "../middleware/authorize.middleware.js";

import { validate } from "../middleware/validate.middleware.js";

import {
  createBillSchema,
  listBillSchema,
  billIdSchema,
  updateBillSchema,
  updateBillStatusSchema,
} from "../validators/bill.validator.js";

const router = express.Router();

router.post(
  "/",
  authenticate,
  authorize("owner", "admin", "employee"),
  validate(createBillSchema),
  create,
);

router.get(
  "/",
  authenticate,
  authorize("owner", "admin", "employee"),
  validate(listBillSchema),
  list,
);

router.get(
  "/:id",
  authenticate,
  authorize("owner", "admin", "employee"),
  validate(billIdSchema),
  getOne,
);

router.patch(
  "/:id",
  authenticate,
  authorize("owner", "admin", "employee"),
  validate(updateBillSchema),
  update,
);

router.patch(
  "/:id/status",
  authenticate,
  authorize("owner", "admin"),
  validate(updateBillStatusSchema),
  updateStatus,
);

export default router;
