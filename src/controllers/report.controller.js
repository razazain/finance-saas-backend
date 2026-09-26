import {
  getIncomeExpenseReport,
  getCashFlowReport,
  getCategoryBreakdownReport,
  getMonthlySummaryReport,
  getAccountSummaryReport
} from "../services/report.service.js";

import {
  successResponse
} from "../utils/response.js";

import {
  asyncHandler
} from "../utils/asyncHandler.js";

export const incomeExpense =
  asyncHandler(
    async (req, res) => {
      const result =
        await getIncomeExpenseReport({
          businessId:
            req.user.businessId,

          ...req.validated.query
        });

      return successResponse({
        res,

        message:
          "Income and expense report retrieved successfully",

        data: result
      });
    }
  );

export const cashFlow =
  asyncHandler(
    async (req, res) => {
      const result =
        await getCashFlowReport({
          businessId:
            req.user.businessId,

          ...req.validated.query
        });

      return successResponse({
        res,

        message:
          "Cash flow report retrieved successfully",

        data: {
          cashFlow:
            result
        }
      });
    }
  );

export const categoryBreakdown =
  asyncHandler(
    async (req, res) => {
      const result =
        await getCategoryBreakdownReport({
          businessId:
            req.user.businessId,

          ...req.validated.query
        });

      return successResponse({
        res,

        message:
          "Category breakdown report retrieved successfully",

        data: {
          categories:
            result
        }
      });
    }
  );

export const monthlySummary =
  asyncHandler(
    async (req, res) => {
      const result =
        await getMonthlySummaryReport({
          businessId:
            req.user.businessId,

          ...req.validated.query
        });

      return successResponse({
        res,

        message:
          "Monthly financial summary retrieved successfully",

        data: {
          months:
            result
        }
      });
    }
  );

export const accountSummary =
  asyncHandler(
    async (req, res) => {
      const result =
        await getAccountSummaryReport({
          businessId:
            req.user.businessId,

          ...req.validated.query
        });

      return successResponse({
        res,

        message:
          "Account summary report retrieved successfully",

        data: {
          accounts:
            result
        }
      });
    }
  );