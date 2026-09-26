import mongoose from "mongoose";

import Transaction from "../models/Transaction.js";
import Account from "../models/Account.js";
import Category from "../models/Category.js";

import {
  AppError
} from "../utils/appError.js";

const decimalToString =
  (value) => {
    if (
      value === null ||
      value === undefined
    ) {
      return "0";
    }

    return value.toString();
  };

const getBusinessObjectId =
  (businessId) => {
    if (
      !mongoose.Types.ObjectId.isValid(
        businessId
      )
    ) {
      throw new AppError(
        "Invalid business ID",
        400,
        "INVALID_BUSINESS_ID"
      );
    }

    return new mongoose.Types.ObjectId(
      businessId
    );
  };

const buildDateFilter =
  ({
    from,
    to
  }) => {
    const filter = {};

    if (from || to) {
      filter.transactionDate = {};

      if (from) {
        filter.transactionDate.$gte =
          new Date(from);
      }

      if (to) {
        filter.transactionDate.$lte =
          new Date(to);
      }
    }

    return filter;
  };

/*
 * ============================================================
 * INCOME VS EXPENSE
 * ============================================================
 */

export const getIncomeExpenseReport =
  async ({
    businessId,
    from,
    to
  }) => {
    const businessObjectId =
      getBusinessObjectId(
        businessId
      );

    const dateFilter =
      buildDateFilter({
        from,
        to
      });

    const [
      result
    ] =
      await Transaction.aggregate([
        {
          $match: {
            businessId:
              businessObjectId,

            status:
              "posted",

            type: {
              $in: [
                "income",
                "expense"
              ]
            },

            ...dateFilter
          }
        },

        {
          $group: {
            _id: "$type",

            total: {
              $sum: "$amount"
            },

            transactionCount: {
              $sum: 1
            }
          }
        }
      ]);

    const aggregation =
      await Transaction.aggregate([
        {
          $match: {
            businessId:
              businessObjectId,

            status:
              "posted",

            type: {
              $in: [
                "income",
                "expense"
              ]
            },

            ...dateFilter
          }
        },

        {
          $group: {
            _id: "$type",

            total: {
              $sum: "$amount"
            },

            transactionCount: {
              $sum: 1
            }
          }
        }
      ]);

    let income =
      new mongoose.Types.Decimal128(
        "0"
      );

    let expense =
      new mongoose.Types.Decimal128(
        "0"
      );

    let incomeCount = 0;
    let expenseCount = 0;

    for (
      const item of aggregation
    ) {
      if (
        item._id === "income"
      ) {
        income =
          item.total;

        incomeCount =
          item.transactionCount;
      }

      if (
        item._id === "expense"
      ) {
        expense =
          item.total;

        expenseCount =
          item.transactionCount;
      }
    }

    const net =
      mongoose.Types.Decimal128
        .fromString(
          (
            Number(
              income.toString()
            ) -
            Number(
              expense.toString()
            )
          ).toFixed(4)
        );

    return {
      income:
        decimalToString(
          income
        ),

      expense:
        decimalToString(
          expense
        ),

      netIncome:
        decimalToString(
          net
        ),

      incomeTransactionCount:
        incomeCount,

      expenseTransactionCount:
        expenseCount
    };
  };

/*
 * ============================================================
 * CASH FLOW REPORT
 * ============================================================
 */

export const getCashFlowReport =
  async ({
    businessId,
    from,
    to
  }) => {
    const businessObjectId =
      getBusinessObjectId(
        businessId
      );

    const dateFilter =
      buildDateFilter({
        from,
        to
      });

    const result =
      await Transaction.aggregate([
        {
          $match: {
            businessId:
              businessObjectId,

            status:
              "posted",

            type: {
              $in: [
                "income",
                "expense"
              ]
            },

            ...dateFilter
          }
        },

        {
          $group: {
            _id: {
              $dateToString: {
                format:
                  "%Y-%m-%d",

                date:
                  "$transactionDate"
              }
            },

            income: {
              $sum: {
                $cond: [
                  {
                    $eq: [
                      "$type",
                      "income"
                    ]
                  },

                  "$amount",

                  {
                    $toDecimal:
                      "0"
                  }
                ]
              }
            },

            expense: {
              $sum: {
                $cond: [
                  {
                    $eq: [
                      "$type",
                      "expense"
                    ]
                  },

                  "$amount",

                  {
                    $toDecimal:
                      "0"
                  }
                ]
              }
            }
          }
        },

        {
          $project: {
            _id: 0,

            date:
              "$_id",

            income: 1,

            expense: 1,

            netCashFlow: {
              $subtract: [
                "$income",
                "$expense"
              ]
            }
          }
        },

        {
          $sort: {
            date: 1
          }
        }
      ]);

    return result.map(
      (item) => ({
        date:
          item.date,

        income:
          decimalToString(
            item.income
          ),

        expense:
          decimalToString(
            item.expense
          ),

        netCashFlow:
          decimalToString(
            item.netCashFlow
          )
      })
    );
  };

/*
 * ============================================================
 * CATEGORY BREAKDOWN
 * ============================================================
 */

export const getCategoryBreakdownReport =
  async ({
    businessId,
    from,
    to,
    type,
    categoryId
  }) => {
    const businessObjectId =
      getBusinessObjectId(
        businessId
      );

    const dateFilter =
      buildDateFilter({
        from,
        to
      });

    const match = {
      businessId:
        businessObjectId,

      status:
        "posted",

      type: {
        $in: [
          "income",
          "expense"
        ]
      },

      ...dateFilter
    };

    if (type) {
      match.type = type;
    }

    if (categoryId) {
      match.categoryId =
        new mongoose.Types.ObjectId(
          categoryId
        );
    }

    const result =
      await Transaction.aggregate([
        {
          $match:
            match
        },

        {
          $group: {
            _id: {
              categoryId:
                "$categoryId",

              type:
                "$type"
            },

            total: {
              $sum:
                "$amount"
            },

            transactionCount: {
              $sum:
                1
            }
          }
        },

        {
          $lookup: {
            from:
              "categories",

            localField:
              "_id.categoryId",

            foreignField:
              "_id",

            as:
              "category"
          }
        },

        {
          $unwind: {
            path:
              "$category",

            preserveNullAndEmptyArrays:
              true
          }
        },

        {
          $project: {
            _id: 0,

            categoryId:
              "$_id.categoryId",

            categoryName:
              "$category.name",

            type:
              "$_id.type",

            total: 1,

            transactionCount: 1
          }
        },

        {
          $sort: {
            total: -1
          }
        }
      ]);

    return result.map(
      (item) => ({
        categoryId:
          item.categoryId,

        categoryName:
          item.categoryName ||
          "Uncategorized",

        type:
          item.type,

        total:
          decimalToString(
            item.total
          ),

        transactionCount:
          item.transactionCount
      })
    );
  };

/*
 * ============================================================
 * MONTHLY SUMMARY
 * ============================================================
 */

export const getMonthlySummaryReport =
  async ({
    businessId,
    from,
    to
  }) => {
    const businessObjectId =
      getBusinessObjectId(
        businessId
      );

    const dateFilter =
      buildDateFilter({
        from,
        to
      });

    const result =
      await Transaction.aggregate([
        {
          $match: {
            businessId:
              businessObjectId,

            status:
              "posted",

            type: {
              $in: [
                "income",
                "expense"
              ]
            },

            ...dateFilter
          }
        },

        {
          $group: {
            _id: {
              year: {
                $year:
                  "$transactionDate"
              },

              month: {
                $month:
                  "$transactionDate"
              }
            },

            income: {
              $sum: {
                $cond: [
                  {
                    $eq: [
                      "$type",
                      "income"
                    ]
                  },

                  "$amount",

                  {
                    $toDecimal:
                      "0"
                  }
                ]
              }
            },

            expense: {
              $sum: {
                $cond: [
                  {
                    $eq: [
                      "$type",
                      "expense"
                    ]
                  },

                  "$amount",

                  {
                    $toDecimal:
                      "0"
                  }
                ]
              }
            },

            transactionCount: {
              $sum: 1
            }
          }
        },

        {
          $project: {
            _id: 0,

            year:
              "$_id.year",

            month:
              "$_id.month",

            income: 1,

            expense: 1,

            netCashFlow: {
              $subtract: [
                "$income",
                "$expense"
              ]
            },

            transactionCount: 1
          }
        },

        {
          $sort: {
            year: 1,
            month: 1
          }
        }
      ]);

    return result.map(
      (item) => ({
        year:
          item.year,

        month:
          item.month,

        income:
          decimalToString(
            item.income
          ),

        expense:
          decimalToString(
            item.expense
          ),

        netCashFlow:
          decimalToString(
            item.netCashFlow
          ),

        transactionCount:
          item.transactionCount
      })
    );
  };

/*
 * ============================================================
 * ACCOUNT SUMMARY
 * ============================================================
 */

export const getAccountSummaryReport =
  async ({
    businessId,
    from,
    to,
    accountId
  }) => {
    const businessObjectId =
      getBusinessObjectId(
        businessId
      );

    const dateFilter =
      buildDateFilter({
        from,
        to
      });

    const match = {
      businessId:
        businessObjectId,

      status:
        "posted",

      type: {
        $in: [
          "income",
          "expense",
          "transfer"
        ]
      },

      ...dateFilter
    };

    if (accountId) {
      match.accountId =
        new mongoose.Types.ObjectId(
          accountId
        );
    }

    const result =
      await Transaction.aggregate([
        {
          $match:
            match
        },

        {
          $group: {
            _id: {
              accountId:
                "$accountId",

              type:
                "$type"
            },

            total: {
              $sum:
                "$amount"
            },

            transactionCount: {
              $sum:
                1
            }
          }
        },

        {
          $lookup: {
            from:
              "accounts",

            localField:
              "_id.accountId",

            foreignField:
              "_id",

            as:
              "account"
          }
        },

        {
          $unwind:
            "$account"
        },

        {
          $project: {
            _id: 0,

            accountId:
              "$_id.accountId",

            accountName:
              "$account.name",

            accountType:
              "$account.type",

            transactionType:
              "$_id.type",

            total: 1,

            transactionCount: 1
          }
        },

        {
          $sort: {
            accountName: 1,
            transactionType: 1
          }
        }
      ]);

    return result.map(
      (item) => ({
        accountId:
          item.accountId,

        accountName:
          item.accountName,

        accountType:
          item.accountType,

        transactionType:
          item.transactionType,

        total:
          decimalToString(
            item.total
          ),

        transactionCount:
          item.transactionCount
      })
    );
  };