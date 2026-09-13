import {
  createRecurringTransaction,
  getRecurringTransactions,
  getRecurringTransactionById,
  updateRecurringStatus,
  executeRecurringTransaction
} from "../services/recurringTransaction.service.js";

import {
  successResponse
} from "../utils/response.js";

import {
  asyncHandler
} from "../utils/asyncHandler.js";

/*
 * CREATE
 */
export const create =
  asyncHandler(
    async (req, res) => {
      const recurring =
        await createRecurringTransaction({
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
          "Recurring transaction created successfully",

        data: {
          recurringTransaction:
            recurring
        }
      });
    }
  );

/*
 * LIST
 */
export const list =
  asyncHandler(
    async (req, res) => {
      const result =
        await getRecurringTransactions({
          businessId:
            req.user.businessId,

          ...req.validated.query
        });

      return successResponse({
        res,

        message:
          "Recurring transactions retrieved successfully",

        data:
          result
      });
    }
  );

/*
 * GET ONE
 */
export const getOne =
  asyncHandler(
    async (req, res) => {
      const recurring =
        await getRecurringTransactionById({
          businessId:
            req.user.businessId,

          recurringId:
            req.validated
              .params
              .id
        });

      return successResponse({
        res,

        message:
          "Recurring transaction retrieved successfully",

        data: {
          recurringTransaction:
            recurring
        }
      });
    }
  );

/*
 * PAUSE / RESUME
 */
export const updateStatus =
  asyncHandler(
    async (req, res) => {
      const recurring =
        await updateRecurringStatus({
          businessId:
            req.user.businessId,

          recurringId:
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
          req.validated
            .body
            .isActive
            ? "Recurring transaction resumed successfully"
            : "Recurring transaction paused successfully",

        data: {
          recurringTransaction:
            recurring
        }
      });
    }
  );

/*
 * MANUAL EXECUTION
 *
 * This endpoint is primarily useful
 * for testing and future scheduler
 * integration.
 */
export const execute =
  asyncHandler(
    async (req, res) => {
      const result =
        await executeRecurringTransaction({
          businessId:
            req.user.businessId,

          recurringId:
            req.validated
              .params
              .id,

          userId:
            req.user.userId
        });

      return successResponse({
        res,

        message:
          "Recurring transaction executed successfully",

        data:
          result
      });
    }
  );