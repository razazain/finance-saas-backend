import express from "express";
import {
  register,
  login,
  refresh,
  logout,
  verifyEmailController,
  requestPasswordResetController,
  resetPasswordController,
  setupMfaController,
  enableMfaController,
  disableMfaController,
  resendVerificationController,
} from "../controllers/auth.contoller.js";
import { validate } from "../middleware/validate.middleware.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/authorize.middleware.js";
import { registerSchema, loginSchema } from "../validators/auth.validator.js";
import {
  verifyEmailSchema,
  resetRequestSchema,
  resetPasswordSchema,
  mfaCodeSchema,
} from "../validators/security.validator.js";
const router = express.Router();
router.post("/register", validate(registerSchema), register);
router.post("/login", validate(loginSchema), login);
router.post("/refresh", refresh);
router.post("/logout", logout);
router.post(
  "/verify-email",
  validate(verifyEmailSchema),
  verifyEmailController,
);
router.post(
  "/password-reset/request",
  validate(resetRequestSchema),
  requestPasswordResetController,
);
router.post(
  "/password-reset/confirm",
  validate(resetPasswordSchema),
  resetPasswordController,
);
router.post("/verification/resend", authenticate, resendVerificationController);
router.post(
  "/mfa/setup",
  authenticate,
  authorize("owner", "admin", "employee"),
  setupMfaController,
);
router.post(
  "/mfa/enable",
  authenticate,
  authorize("owner", "admin", "employee"),
  validate(mfaCodeSchema),
  enableMfaController,
);
router.post(
  "/mfa/disable",
  authenticate,
  authorize("owner", "admin", "employee"),
  validate(mfaCodeSchema),
  disableMfaController,
);
export default router;
