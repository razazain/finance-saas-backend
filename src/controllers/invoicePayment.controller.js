import {
  createInvoicePayment,
  getInvoicePayments,
  getInvoicePaymentById
} from "../services/invoicePayment.service.js";

import {
  successResponse
} from "../utils/response.js";

import {
  asyncHandler
} from "../utils/asyncHandler.js";

/*
 * CREATE PAYMENT
 */
export const create =
  asyncHandler(
    async (req, res) => {
      const payment =
        await createInvoicePayment({
          businessId:
            req.user.businessId,

          invoiceId:
            req.validated.params.id,

          userId:
            req.user.userId,

          ...req.validated.body
        });

      return successResponse({
        res,
        statusCode: 201,
        message:
          "Invoice payment recorded successfully",
        data: {
          payment
        }
      });
    }
  );

/*
 * LIST PAYMENTS
 */
export const list =
  asyncHandler(
    async (req, res) => {
      const result =
        await getInvoicePayments({
          businessId:
            req.user.businessId,

          invoiceId:
            req.validated.params.id
        });

      return successResponse({
        res,
        message:
          "Invoice payments retrieved successfully",
        data: result
      });
    }
  );

/*
 * GET SINGLE PAYMENT
 */
export const getOne =
  asyncHandler(
    async (req, res) => {
      const payment =
        await getInvoicePaymentById({
          businessId:
            req.user.businessId,

          paymentId:
            req.validated.params.id
        });

      return successResponse({
        res,
        message:
          "Invoice payment retrieved successfully",
        data: {
          payment
        }
      });
    }
  );