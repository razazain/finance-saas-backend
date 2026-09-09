import {
  createBillPayment,
  getBillPayments,
  getBillPaymentById
} from "../services/billPayment.service.js";

import {
  successResponse
} from "../utils/response.js";

import {
  asyncHandler
} from "../utils/asyncHandler.js";

/*
 * CREATE BILL PAYMENT
 */
export const create =
  asyncHandler(
    async (req, res) => {
      const payment =
        await createBillPayment({
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

        statusCode: 201,

        message:
          "Bill payment recorded successfully",

        data: {
          payment
        }
      });
    }
  );

/*
 * LIST BILL PAYMENTS
 */
export const list =
  asyncHandler(
    async (req, res) => {
      const result =
        await getBillPayments({
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
          "Bill payments retrieved successfully",

        data: result
      });
    }
  );

/*
 * GET SINGLE BILL PAYMENT
 */
export const getOne =
  asyncHandler(
    async (req, res) => {
      const payment =
        await getBillPaymentById({
          businessId:
            req.user.businessId,

          paymentId:
            req.validated
              .params
              .id
        });

      return successResponse({
        res,

        message:
          "Bill payment retrieved successfully",

        data: {
          payment
        }
      });
    }
  );