import express from "express";

import {
  create,
  list,
  getOne,
  update,
  updateStatus
} from "../controllers/category.controller.js";

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
  createCategorySchema,
  listCategorySchema,
  categoryIdSchema,
  updateCategorySchema,
  updateCategoryStatusSchema
} from "../validators/category.validator.js";

const router =
  express.Router();

/*
 * Create category
 *
 * Owner and admin can create categories.
 */
router.post(
  "/",
  authenticate,
  authorize(
    "owner",
    "admin"
  ),
  validate(
    createCategorySchema
  ),
  create
);

/*
 * List categories
 *
 * Employees need read access too.
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
    listCategorySchema
  ),
  list
);

/*
 * Get one category.
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
    categoryIdSchema
  ),
  getOne
);

/*
 * Update category.
 */
router.patch(
  "/:id",
  authenticate,
  authorize(
    "owner",
    "admin"
  ),
  validate(
    updateCategorySchema
  ),
  update
);

/*
 * Activate/deactivate category.
 */
router.patch(
  "/:id/status",
  authenticate,
  authorize(
    "owner",
    "admin"
  ),
  validate(
    updateCategoryStatusSchema
  ),
  updateStatus
);

export default router;