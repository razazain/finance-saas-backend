import {
  createAccount,
  getAccounts,
  getAccountById,
  updateAccount,
  updateAccountStatus
} from "../services/account.service.js";

import {
  successResponse
} from "../utils/response.js";

import {
  asyncHandler
} from "../utils/asyncHandler.js";

export const create =
  asyncHandler(
    async (req, res) => {
      const account =
        await createAccount({
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
          "Account created successfully",
        data: {
          account
        }
      });
    }
  );

export const list =
  asyncHandler(
    async (req, res) => {
      const accounts =
        await getAccounts({
          businessId:
            req.user.businessId,

          ...req.validated.query
        });

      return successResponse({
        res,
        message:
          "Accounts retrieved successfully",
        data: {
          accounts
        }
      });
    }
  );

export const getOne =
  asyncHandler(
    async (req, res) => {
      const account =
        await getAccountById({
          businessId:
            req.user.businessId,

          accountId:
            req.validated.params.id
        });

      return successResponse({
        res,
        message:
          "Account retrieved successfully",
        data: {
          account
        }
      });
    }
  );

export const update =
  asyncHandler(
    async (req, res) => {
      const account =
        await updateAccount({
          businessId:
            req.user.businessId,

          accountId:
            req.validated.params.id,

          userId:
            req.user.userId,

          ...req.validated.body
        });

      return successResponse({
        res,
        message:
          "Account updated successfully",
        data: {
          account
        }
      });
    }
  );

export const updateStatus =
  asyncHandler(
    async (req, res) => {
      const account =
        await updateAccountStatus({
          businessId:
            req.user.businessId,

          accountId:
            req.validated.params.id,

          userId:
            req.user.userId,

          isActive:
            req.validated.body.isActive
        });

      return successResponse({
        res,
        message:
          "Account status updated successfully",
        data: {
          account
        }
      });
    }
  );