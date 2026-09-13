import express from "express";

import {
  getPartyLedgerController
} from "../controllers/ledger.controller.js";

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
  partyLedgerSchema
} from "../validators/ledger.validator.js";

const router =
  express.Router();

/*
 * Get customer/vendor ledger.
 */
router.get(
  "/parties/:id/ledger",

  authenticate,

  authorize(
    "owner",
    "admin",
    "employee"
  ),

  validate(
    partyLedgerSchema
  ),

  getPartyLedgerController
);

export default router;