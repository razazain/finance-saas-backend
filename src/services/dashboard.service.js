import mongoose from "mongoose";

import Transaction from "../models/Transaction.js";
import Account from "../models/Account.js";

/*
 * Convert MongoDB Decimal128 values
 * to strings for API responses.
 *
 * IMPORTANT:
 * We never convert financial values
 * to JavaScript Number.
 */
const decimalToString = (value) => {
  if (
    value === null ||
    value === undefined
  ) {
    return "0";
  }

  return value.toString();
};

/*
 * Build transaction date filter.
 *
 * from / to are expected to already
 * be validated by Zod.
 */
const getDateRange = ({
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
 * Validate and convert businessId
 * to MongoDB ObjectId.
 */
const getBusinessObjectId = (
  businessId
) => {
  if (
    !mongoose.Types.ObjectId.isValid(
      businessId
    )
  ) {
    throw new Error(
      "Invalid business ID"
    );
  }

  return new mongoose.Types.ObjectId(
    businessId
  );
};

/*
 * ============================================================
 * DASHBOARD SUMMARY
 * ============================================================
 *
 * Returns:
 *
 * totalIncome
 * totalExpenses
 * netCashFlow
 * transactionCount
 *
 * Financial calculations are performed
 * entirely inside MongoDB using Decimal128.
 */
export const getDashboardSummary =
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
      getDateRange({
        from,
        to
      });

    const [
      summary
    ] =
      await Transaction.aggregate([
        {
          $match: {
            businessId:
              businessObjectId,

            /*
             * Only posted transactions
             * affect financial reports.
             *
             * Voided transactions are
             * therefore excluded.
             */
            status: "posted",

            /*
             * Dashboard cash-flow summary
             * only considers income and
             * expense.
             *
             * Transfers are deliberately
             * excluded because a transfer
             * does not create income or
             * expense.
             */
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
            _id: null,

            totalIncome: {
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

            totalExpenses: {
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

        /*
         * IMPORTANT:
         *
         * netCashFlow is calculated
         * by MongoDB using Decimal128.
         *
         * We do NOT use:
         *
         * parseFloat()
         *
         * in Node.js.
         */
        {
          $project: {
            _id: 0,

            totalIncome: 1,

            totalExpenses: 1,

            netCashFlow: {
              $subtract: [
                "$totalIncome",
                "$totalExpenses"
              ]
            },

            transactionCount: 1
          }
        }
      ]);

    /*
     * No transactions found.
     *
     * Return zero values instead
     * of null/undefined.
     */
    if (!summary) {
      return {
        totalIncome: "0",

        totalExpenses: "0",

        netCashFlow: "0",

        transactionCount: 0
      };
    }

    return {
      totalIncome:
        decimalToString(
          summary.totalIncome
        ),

      totalExpenses:
        decimalToString(
          summary.totalExpenses
        ),

      netCashFlow:
        decimalToString(
          summary.netCashFlow
        ),

      transactionCount:
        summary.transactionCount
    };
  };

/*
 * ============================================================
 * CASH FLOW
 * ============================================================
 *
 * Groups income and expenses
 * by calendar day.
 */
export const getCashFlow =
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
      getDateRange({
        from,
        to
      });

    const result =
      await Transaction.aggregate([
        {
          $match: {
            businessId:
              businessObjectId,

            status: "posted",

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

        /*
         * Calculate daily net cash flow
         * using Decimal128 in MongoDB.
         */
        {
          $project: {
            _id: 0,

            date: "$_id",

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
 *
 * Groups posted income/expense
 * transactions by category.
 */
export const getCategoryBreakdown =
  async ({
    businessId,
    from,
    to,
    type
  }) => {
    const businessObjectId =
      getBusinessObjectId(
        businessId
      );

    const dateFilter =
      getDateRange({
        from,
        to
      });

    const match = {
      businessId:
        businessObjectId,

      status: "posted",

      type: {
        $in: [
          "income",
          "expense"
        ]
      },

      ...dateFilter
    };

    /*
     * Optional type filter.
     */
    if (type) {
      match.type =
        type;
    }

    const result =
      await Transaction.aggregate([
        {
          $match: match
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
              $sum: 1
            }
          }
        },

        /*
         * Load category information.
         */
        {
          $lookup: {
            from: "categories",

            localField:
              "_id.categoryId",

            foreignField:
              "_id",

            as: "category"
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

        /*
         * IMPORTANT:
         *
         * This is the correct
         * category projection.
         */
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
          "Unknown",

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
 * ACCOUNT BALANCES
 * ============================================================
 *
 * Returns current balances from
 * the Account collection.
 *
 * No financial recalculation is
 * performed here.
 */
export const getAccountBalances =
  async ({
    businessId
  }) => {
    const accounts =
      await Account.find({
        businessId,
        isActive: true
      })
        .select(
          "_id name type currency currentBalance"
        )
        .sort({
          name: 1
        });

    return accounts.map(
      (account) => ({
        id:
          account._id,

        name:
          account.name,

        type:
          account.type,

        currency:
          account.currency,

        balance:
          decimalToString(
            account.currentBalance
          )
      })
    );
  };

/*
 * ============================================================
 * RECENT TRANSACTIONS
 * ============================================================
 *
 * Returns the latest transactions
 * belonging to the authenticated
 * business.
 */
export const getRecentTransactions =
  async ({
    businessId,
    limit = 10
  }) => {
    /*
     * Extra server-side protection.
     *
     * Even if this service is called
     * directly in the future, don't
     * allow an unreasonable limit.
     */
    const safeLimit =
      Math.min(
        Math.max(
          Number(limit) || 10,
          1
        ),
        50
      );

    const transactions =
      await Transaction.find({
        businessId
      })
        .populate(
          "accountId",
          "_id name type currency"
        )
        .populate(
          "destinationAccountId",
          "_id name type currency"
        )
        .populate(
          "categoryId",
          "_id name type"
        )
        .populate(
          "createdBy",
          "_id name"
        )
        .sort({
          transactionDate: -1,
          createdAt: -1
        })
        .limit(
          safeLimit
        );

    return transactions.map(
      (transaction) => {
        const object =
          transaction.toObject();

        return {
          ...object,

          /*
           * Convert Decimal128
           * to string.
           *
           * Never use Number().
           */
          amount:
            decimalToString(
              object.amount
            )
        };
      }
    );
  };