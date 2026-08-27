import {
  createTransaction,
  getTransactions,
  getTransactionById,
  voidTransaction
} from "../services/transaction.service.js";

import {
  successResponse
} from "../utils/response.js";

import {
  asyncHandler
} from "../utils/asyncHandler.js";

export const create =
  asyncHandler(
    async (req, res) => {
      const transaction =
        await createTransaction({
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
          "Transaction created successfully",
        data: {
          transaction
        }
      });
    }
  );

export const list =
  asyncHandler(
    async (req, res) => {
      const result =
        await getTransactions({
          businessId:
            req.user.businessId,

          ...req.validated.query
        });

      return successResponse({
        res,
        message:
          "Transactions retrieved successfully",
        data: result
      });
    }
  );

export const getOne =
  asyncHandler(
    async (req, res) => {
      const transaction =
        await getTransactionById({
          businessId:
            req.user.businessId,

          transactionId:
            req.validated.params.id
        });

      return successResponse({
        res,
        message:
          "Transaction retrieved successfully",
        data: {
          transaction
        }
      });
    }
  );

export const voidOne =
  asyncHandler(
    async (req, res) => {
      const transaction =
        await voidTransaction({
          businessId:
            req.user.businessId,

          transactionId:
            req.validated.params.id,

          userId:
            req.user.userId,

          reason:
            req.validated.body.reason
        });

      return successResponse({
        res,
        message:
          "Transaction voided successfully",
        data: {
          transaction
        }
      });
    }
  );