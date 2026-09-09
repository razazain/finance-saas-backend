import {
  createBill,
  getBills,
  getBillById,
  updateBill,
  updateBillStatus
} from "../services/bill.service.js";

import {
  successResponse
} from "../utils/response.js";

import {
  asyncHandler
} from "../utils/asyncHandler.js";

/*
 * CREATE BILL
 */
export const create =
  asyncHandler(
    async (req, res) => {
      const bill =
        await createBill({
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
          "Bill created successfully",

        data: {
          bill
        }
      });
    }
  );

/*
 * LIST BILLS
 */
export const list =
  asyncHandler(
    async (req, res) => {
      const result =
        await getBills({
          businessId:
            req.user.businessId,

          ...req.validated.query
        });

      return successResponse({
        res,

        message:
          "Bills retrieved successfully",

        data: result
      });
    }
  );

/*
 * GET BILL
 */
export const getOne =
  asyncHandler(
    async (req, res) => {
      const bill =
        await getBillById({
          businessId:
            req.user.businessId,

          billId:
            req.validated
              .params
              .id
        });

      return successResponse({
        res,

        message:
          "Bill retrieved successfully",

        data: {
          bill
        }
      });
    }
  );

/*
 * UPDATE BILL
 */
export const update =
  asyncHandler(
    async (req, res) => {
      const bill =
        await updateBill({
          businessId:
            req.user.businessId,

          billId:
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
          "Bill updated successfully",

        data: {
          bill
        }
      });
    }
  );

/*
 * UPDATE STATUS
 */
export const updateStatus =
  asyncHandler(
    async (req, res) => {
      const bill =
        await updateBillStatus({
          businessId:
            req.user.businessId,

          billId:
            req.validated
              .params
              .id,

          userId:
            req.user.userId,

          status:
            req.validated
              .body
              .status
        });

      return successResponse({
        res,

        message:
          "Bill status updated successfully",

        data: {
          bill
        }
      });
    }
  );