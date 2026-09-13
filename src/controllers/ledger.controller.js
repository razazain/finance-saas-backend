import {
  getPartyLedger
} from "../services/ledger.service.js";

import {
  successResponse
} from "../utils/response.js";

import {
  asyncHandler
} from "../utils/asyncHandler.js";

export const getPartyLedgerController =
  asyncHandler(
    async (req, res) => {
      const result =
        await getPartyLedger({
          businessId:
            req.user.businessId,

          partyId:
            req.validated
              .params
              .id,

          ...req.validated.query
        });

      return successResponse({
        res,

        message:
          "Party ledger retrieved successfully",

        data:
          result
      });
    }
  );