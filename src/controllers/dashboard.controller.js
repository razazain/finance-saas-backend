import {
  getDashboardSummary,
  getCashFlow,
  getCategoryBreakdown,
  getAccountBalances,
  getRecentTransactions
} from "../services/dashboard.service.js";

import {
  successResponse
} from "../utils/response.js";

import {
  asyncHandler
} from "../utils/asyncHandler.js";

export const summary =
  asyncHandler(
    async (req, res) => {
      const data =
        await getDashboardSummary({
          businessId:
            req.user.businessId,

          ...req.validated.query
        });

      return successResponse({
        res,
        message:
          "Dashboard summary retrieved successfully",
        data
      });
    }
  );

export const cashFlow =
  asyncHandler(
    async (req, res) => {
      const cashFlow =
        await getCashFlow({
          businessId:
            req.user.businessId,

          ...req.validated.query
        });

      return successResponse({
        res,
        message:
          "Cash flow retrieved successfully",
        data: {
          cashFlow
        }
      });
    }
  );

export const categoryBreakdown =
  asyncHandler(
    async (req, res) => {
      const breakdown =
        await getCategoryBreakdown({
          businessId:
            req.user.businessId,

          ...req.validated.query
        });

      return successResponse({
        res,
        message:
          "Category breakdown retrieved successfully",
        data: {
          breakdown
        }
      });
    }
  );

export const accountBalances =
  asyncHandler(
    async (req, res) => {
      const accounts =
        await getAccountBalances({
          businessId:
            req.user.businessId
        });

      return successResponse({
        res,
        message:
          "Account balances retrieved successfully",
        data: {
          accounts
        }
      });
    }
  );

export const recentTransactions =
  asyncHandler(
    async (req, res) => {
      const transactions =
        await getRecentTransactions({
          businessId:
            req.user.businessId,

          ...req.validated.query
        });

      return successResponse({
        res,
        message:
          "Recent transactions retrieved successfully",
        data: {
          transactions
        }
      });
    }
  );