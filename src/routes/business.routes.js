import express from "express";

import { authenticate } from "../middleware/auth.middleware.js";

import { authorize } from "../middleware/authorize.middleware.js";

import {
  getBusinessProfile,
  updateBusinessProfile,
} from "../controllers/bussiness.controller.js";
import { validate } from "../middleware/validate.middleware.js";
import { updateBusinessSchema } from "../validators/business.validator.js";

const router = express.Router();

router.get("/auth-test", authenticate, (req, res) => {
  res.status(200).json({
    success: true,
    message: "Authentication successful",
    data: {
      user: req.user,
    },
  });
});

router.get(
  "/me",
  authenticate,
  authorize("owner", "admin", "employee"),
  getBusinessProfile,
);

export default router;
router.patch(
  "/me",
  authenticate,
  authorize("owner"),
  validate(updateBusinessSchema),
  updateBusinessProfile,
);
