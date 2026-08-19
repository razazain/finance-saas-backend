import express from "express";

import {
  authenticate
} from "../middleware/auth.middleware.js";

import {
  authorize
} from "../middleware/authorize.middleware.js";

const router = express.Router();

router.get(
  "/auth-test",
  authenticate,
  (req, res) => {
    res.status(200).json({
      success: true,
      message: "Authentication successful",
      data: {
        user: req.user
      }
    });
  }
);


router.get(
  "/me",
  authenticate,
  authorize("owner", "admin", "employee"),
  //getMyBusiness
);

export default router;