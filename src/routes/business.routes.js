import express from "express";

import {
  getBusinessProfile
} from "../controllers/bussiness.controller.js";

import {
  authenticate
} from "../middleware/auth.middleware.js";

const router = express.Router();

router.get(
  "/me",
  authenticate,
  getBusinessProfile
);

export default router;