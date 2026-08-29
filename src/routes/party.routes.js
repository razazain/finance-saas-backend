import express from "express";

import {
    create,
    list,
    getOne,
    update,
    updateStatus
} from "../controllers/party.controller.js";

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
    createPartySchema,
    listPartySchema,
    partyIdSchema,
    updatePartySchema,
    updatePartyStatusSchema
} from "../validators/party.validator.js";

const router =
    express.Router();

router.post(
    "/",
    authenticate,
    authorize(
        "owner",
        "admin"
    ),
    validate(
        createPartySchema
    ),
    create
);

router.get(
    "/",
    authenticate,
    authorize(
        "owner",
        "admin",
        "employee"
    ),
    validate(
        listPartySchema
    ),
    list
);

router.get(
    "/:id",
    authenticate,
    authorize(
        "owner",
        "admin",
        "employee"
    ),
    validate(
        partyIdSchema
    ),
    getOne
);

router.patch(
    "/:id",
    authenticate,
    authorize(
        "owner",
        "admin"
    ),
    validate(
        updatePartySchema
    ),
    update
);

router.patch(
    "/:id/status",
    authenticate,
    authorize(
        "owner",
        "admin"
    ),
    validate(
        updatePartyStatusSchema
    ),
    updateStatus
);

export default router;