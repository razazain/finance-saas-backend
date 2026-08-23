import express from "express";

import {
  createUser,
  getUsers,
  getUserById,
  updateUser,
  updateStatus
} from "../controllers/user.controller.js";

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
  createUserSchema,
  updateUserSchema,
  updateUserStatusSchema,
  getUserSchema
} from "../validators/user.validator.js";

const router =
  express.Router();

router.post(
  "/",
  authenticate,
  authorize("owner", "admin"),
  validate(createUserSchema),
  createUser
);

router.get(
  "/",
  authenticate,
  authorize("owner", "admin"),
  getUsers
);

router.get(
  "/:id",
  authenticate,
  authorize("owner", "admin"),
  validate(getUserSchema),
  getUserById
);

router.patch(
  "/:id",
  authenticate,
  authorize("owner", "admin"),
  validate(updateUserSchema),
  updateUser
);

router.patch(
  "/:id/status",
  authenticate,
  authorize("owner", "admin"),
  validate(updateUserStatusSchema),
  updateStatus
);

export default router;