import {
    createParty,
    getParties,
    getPartyById,
    updateParty,
    updatePartyStatus
} from "../services/party.service.js";

import {
    successResponse
} from "../utils/response.js";

import {
    asyncHandler
} from "../utils/asyncHandler.js";

export const create =
    asyncHandler(
        async (req, res) => {

            const party =
                await createParty({
                    businessId:
                        req.user.businessId,

                    userId:
                        req.user.userId,

                    ...req.validated.body
                });

            return successResponse({
                res,
                statusCode: 201,
                message:
                    "Party created successfully",
                data: {
                    party
                }
            });
        }
    );

export const list =
    asyncHandler(
        async (req, res) => {

            const parties =
                await getParties({
                    businessId:
                        req.user.businessId,

                    ...req.validated.query
                });

            return successResponse({
                res,
                message:
                    "Parties retrieved successfully",
                data: {
                    parties
                }
            });
        }
    );

export const getOne =
    asyncHandler(
        async (req, res) => {

            const party =
                await getPartyById({
                    businessId:
                        req.user.businessId,

                    partyId:
                        req.validated
                            .params
                            .id
                });

            return successResponse({
                res,
                message:
                    "Party retrieved successfully",
                data: {
                    party
                }
            });
        }
    );

export const update =
    asyncHandler(
        async (req, res) => {

            const party =
                await updateParty({
                    businessId:
                        req.user.businessId,

                    partyId:
                        req.validated
                            .params
                            .id,

                    userId:
                        req.user.userId,

                    ...req.validated.body
                });

            return successResponse({
                res,
                message:
                    "Party updated successfully",
                data: {
                    party
                }
            });
        }
    );

export const updateStatus =
    asyncHandler(
        async (req, res) => {

            const party =
                await updatePartyStatus({
                    businessId:
                        req.user.businessId,

                    partyId:
                        req.validated
                            .params
                            .id,

                    userId:
                        req.user.userId,

                    isActive:
                        req.validated
                            .body
                            .isActive
                });

            return successResponse({
                res,
                message:
                    "Party status updated successfully",
                data: {
                    party
                }
            });
        }
    );