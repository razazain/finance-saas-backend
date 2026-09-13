import mongoose from "mongoose";
import Decimal from "decimal.js";

import RecurringTransaction from "../models/RecurringTransaction.js";
import Account from "../models/Account.js";
import Category from "../models/Category.js";
import Business from "../models/Bussiness.js";
import Transaction from "../models/Transaction.js";

import {
  AppError
} from "../utils/appError.js";

Decimal.set({
  precision: 40,
  rounding:
    Decimal.ROUND_HALF_UP
});

/*
 * Decimal128 helper.
 */
const toDecimal128 =
  (value) => {
    return mongoose.Types.Decimal128
      .fromString(
        new Decimal(value)
          .toFixed(4)
      );
  };

/*
 * Decimal128 response helper.
 */
const decimalToString =
  (value) => {
    if (
      value === null ||
      value === undefined
    ) {
      return "0.0000";
    }

    return value.toString();
  };

/*
 * Format recurring transaction.
 */
const formatRecurring =
  (item) => {
    const object =
      item.toObject
        ? item.toObject()
        : item;

    return {
      ...object,

      amount:
        decimalToString(
          object.amount
        )
    };
  };

/*
 * Calculate next execution date.
 */
const calculateNextRun =
  ({
    currentDate,
    frequency,
    intervalDays
  }) => {
    const next =
      new Date(
        currentDate
      );

    switch (
      frequency
    ) {
      case "daily":
        next.setDate(
          next.getDate() + 1
        );
        break;

      case "weekly":
        next.setDate(
          next.getDate() + 7
        );
        break;

      case "monthly":
        next.setMonth(
          next.getMonth() + 1
        );
        break;

      case "yearly":
        next.setFullYear(
          next.getFullYear() + 1
        );
        break;

      case "custom":
        if (
          !intervalDays
        ) {
          throw new AppError(
            "intervalDays is required for custom frequency",
            400,
            "INTERVAL_DAYS_REQUIRED"
          );
        }

        next.setDate(
          next.getDate() +
            intervalDays
        );
        break;

      default:
        throw new AppError(
          "Invalid recurring frequency",
          400,
          "INVALID_RECURRING_FREQUENCY"
        );
    }

    return next;
  };

/*
 * Validate frequency settings.
 */
const validateFrequency =
  ({
    frequency,
    intervalDays
  }) => {
    if (
      frequency ===
        "custom" &&
      !intervalDays
    ) {
      throw new AppError(
        "intervalDays is required for custom frequency",
        400,
        "INTERVAL_DAYS_REQUIRED"
      );
    }

    if (
      frequency !==
        "custom" &&
      intervalDays !==
        undefined &&
      intervalDays !==
        null
    ) {
      throw new AppError(
        "intervalDays can only be used with custom frequency",
        400,
        "INVALID_INTERVAL_DAYS"
      );
    }
  };

/*
 * Validate dates.
 */
const validateDates =
  ({
    startDate,
    endDate
  }) => {
    const start =
      new Date(
        startDate
      );

    if (
      Number.isNaN(
        start.getTime()
      )
    ) {
      throw new AppError(
        "Invalid start date",
        400,
        "INVALID_START_DATE"
      );
    }

    let end = null;

    if (endDate) {
      end =
        new Date(
          endDate
        );

      if (
        Number.isNaN(
          end.getTime()
        )
      ) {
        throw new AppError(
          "Invalid end date",
          400,
          "INVALID_END_DATE"
        );
      }

      if (
        end < start
      ) {
        throw new AppError(
          "End date cannot be before start date",
          400,
          "INVALID_DATE_RANGE"
        );
      }
    }

    return {
      start,
      end
    };
  };

/*
 * Validate account and category.
 */
const validateTransactionSetup =
  async ({
    session,
    business,
    businessId,
    type,
    accountId,
    categoryId,
    destinationAccountId
  }) => {
    /*
     * Source account.
     */
    const account =
      await Account.findOne({
        _id: accountId,
        businessId,
        isActive: true
      }).session(session);

    if (!account) {
      throw new AppError(
        "Account not found or inactive",
        404,
        "ACCOUNT_NOT_FOUND"
      );
    }

    if (
      account.currency !==
      business.currency
    ) {
      throw new AppError(
        "Account currency does not match business currency",
        400,
        "ACCOUNT_CURRENCY_MISMATCH"
      );
    }

    let category = null;
    let destinationAccount =
      null;

    /*
     * Income / expense.
     */
    if (
      type === "income" ||
      type === "expense"
    ) {
      if (!categoryId) {
        throw new AppError(
          "Category is required",
          400,
          "CATEGORY_REQUIRED"
        );
      }

      category =
        await Category.findOne({
          _id: categoryId,
          businessId,
          isActive: true
        }).session(session);

      if (!category) {
        throw new AppError(
          "Category not found or inactive",
          404,
          "CATEGORY_NOT_FOUND"
        );
      }

      if (
        category.type !==
        type
      ) {
        throw new AppError(
          `Category type must be ${type}`,
          400,
          "CATEGORY_TYPE_MISMATCH"
        );
      }

      return {
        account,
        category,
        destinationAccount
      };
    }

    /*
     * Transfer.
     */
    if (
      type === "transfer"
    ) {
      if (
        !destinationAccountId
      ) {
        throw new AppError(
          "Destination account is required for transfers",
          400,
          "DESTINATION_ACCOUNT_REQUIRED"
        );
      }

      if (
        account._id.toString() ===
        destinationAccountId
      ) {
        throw new AppError(
          "Source and destination accounts must be different",
          400,
          "SAME_TRANSFER_ACCOUNT"
        );
      }

      destinationAccount =
        await Account.findOne({
          _id:
            destinationAccountId,

          businessId,

          isActive: true
        }).session(session);

      if (
        !destinationAccount
      ) {
        throw new AppError(
          "Destination account not found or inactive",
          404,
          "DESTINATION_ACCOUNT_NOT_FOUND"
        );
      }

      if (
        account.currency !==
        destinationAccount.currency
      ) {
        throw new AppError(
          "Source and destination accounts must use the same currency",
          400,
          "TRANSFER_CURRENCY_MISMATCH"
        );
      }

      return {
        account,
        category: null,
        destinationAccount
      };
    }

    throw new AppError(
      "Unsupported transaction type",
      400,
      "INVALID_TRANSACTION_TYPE"
    );
  };

/*
 * CREATE RECURRING TRANSACTION
 */
export const createRecurringTransaction =
  async ({
    businessId,
    userId,
    type,
    amount,
    accountId,
    categoryId,
    destinationAccountId,
    description,
    reference,
    frequency,
    intervalDays,
    startDate,
    endDate
  }) => {
    const session =
      await mongoose.startSession();

    try {
      let created;

      await session.withTransaction(
        async () => {
          /*
           * Business.
           */
          const business =
            await Business.findOne({
              _id: businessId,
              isActive: true
            })
              .select(
                "_id currency"
              )
              .session(session);

          if (!business) {
            throw new AppError(
              "Business not found",
              404,
              "BUSINESS_NOT_FOUND"
            );
          }

          /*
           * Frequency.
           */
          validateFrequency({
            frequency,
            intervalDays
          });

          /*
           * Dates.
           */
          const {
            start,
            end
          } =
            validateDates({
              startDate,
              endDate
            });

          /*
           * Account/category setup.
           */
          await validateTransactionSetup({
            session,
            business,
            businessId,
            type,
            accountId,
            categoryId,
            destinationAccountId
          });

          /*
           * Amount.
           */
          const decimalAmount =
            new Decimal(
              amount
            );

          if (
            decimalAmount.lte(0)
          ) {
            throw new AppError(
              "Amount must be greater than 0",
              400,
              "INVALID_AMOUNT"
            );
          }

          /*
           * First execution happens
           * on startDate.
           */
          const recurring =
            new RecurringTransaction({
              businessId,

              type,

              amount:
                toDecimal128(
                  decimalAmount
                ),

              currency:
                business.currency,

              accountId,

              categoryId:
                categoryId ||
                null,

              destinationAccountId:
                destinationAccountId ||
                null,

              description:
                description ||
                null,

              reference:
                reference ||
                null,

              frequency,

              intervalDays:
                frequency ===
                "custom"
                  ? intervalDays
                  : null,

              startDate:
                start,

              endDate:
                end,

              nextRunAt:
                start,

              executionCount:
                0,

              lastTransactionId:
                null,

              isActive:
                true,

              createdBy:
                userId,

              updatedBy:
                userId
            });

          await recurring.save({
            session
          });

          created =
            recurring;
        }
      );

      return getRecurringTransactionById({
        businessId,

        recurringId:
          created._id
      });
    } finally {
      await session.endSession();
    }
  };

/*
 * LIST
 */
export const getRecurringTransactions =
  async ({
    businessId,
    type,
    isActive,
    page = 1,
    limit = 25
  }) => {
    const filter = {
      businessId
    };

    if (type) {
      filter.type =
        type;
    }

    if (
      isActive !==
      undefined
    ) {
      filter.isActive =
        isActive;
    }

    const skip =
      (page - 1) *
      limit;

    const [
      recurring,
      total
    ] =
      await Promise.all([
        RecurringTransaction.find(
          filter
        )
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
            "lastTransactionId",
            "_id type amount transactionDate status"
          )
          .sort({
            nextRunAt: 1,
            createdAt: -1
          })
          .skip(skip)
          .limit(limit),

        RecurringTransaction.countDocuments(
          filter
        )
      ]);

    return {
      recurringTransactions:
        recurring.map(
          formatRecurring
        ),

      pagination: {
        page,

        limit,

        total,

        totalPages:
          Math.ceil(
            total / limit
          )
      }
    };
  };

/*
 * GET ONE
 */
export const getRecurringTransactionById =
  async ({
    businessId,
    recurringId
  }) => {
    const recurring =
      await RecurringTransaction.findOne({
        _id:
          recurringId,

        businessId
      })
        .populate(
          "accountId",
          "_id name type currency currentBalance"
        )
        .populate(
          "destinationAccountId",
          "_id name type currency currentBalance"
        )
        .populate(
          "categoryId",
          "_id name type"
        )
        .populate(
          "lastTransactionId",
          "_id type amount currency accountId destinationAccountId transactionDate description reference status"
        )
        .populate(
          "createdBy",
          "_id name email"
        )
        .populate(
          "updatedBy",
          "_id name email"
        );

    if (!recurring) {
      throw new AppError(
        "Recurring transaction not found",
        404,
        "RECURRING_TRANSACTION_NOT_FOUND"
      );
    }

    return formatRecurring(
      recurring
    );
  };

/*
 * PAUSE / RESUME
 */
export const updateRecurringStatus =
  async ({
    businessId,
    recurringId,
    userId,
    isActive
  }) => {
    const recurring =
      await RecurringTransaction.findOne({
        _id:
          recurringId,

        businessId
      });

    if (!recurring) {
      throw new AppError(
        "Recurring transaction not found",
        404,
        "RECURRING_TRANSACTION_NOT_FOUND"
      );
    }

    /*
     * If end date has already passed,
     * it cannot be resumed.
     */
    if (
      isActive &&
      recurring.endDate &&
      recurring.endDate <
        new Date()
    ) {
      throw new AppError(
        "Recurring transaction has already reached its end date",
        409,
        "RECURRING_TRANSACTION_EXPIRED"
      );
    }

    recurring.isActive =
      isActive;

    recurring.updatedBy =
      userId;

    await recurring.save();

    return getRecurringTransactionById({
      businessId,

      recurringId:
        recurring._id
    });
  };

/*
 * Execute ONE recurring transaction.
 *
 * This is useful for:
 *
 * - manual testing
 * - scheduler
 * - future cron worker
 */
export const executeRecurringTransaction =
  async ({
    businessId,
    recurringId,
    userId,
    executionDate =
      new Date()
  }) => {
    const session =
      await mongoose.startSession();

    try {
      let generatedTransaction;
      let recurringIdForResponse;

      await session.withTransaction(
        async () => {
          /*
           * Load rule.
           */
          const recurring =
            await RecurringTransaction.findOne({
              _id:
                recurringId,

              businessId
            }).session(session);

          if (!recurring) {
            throw new AppError(
              "Recurring transaction not found",
              404,
              "RECURRING_TRANSACTION_NOT_FOUND"
            );
          }

          if (
            !recurring.isActive
          ) {
            throw new AppError(
              "Recurring transaction is inactive",
              409,
              "RECURRING_TRANSACTION_INACTIVE"
            );
          }

          const runDate =
            new Date(
              executionDate
            );

          /*
           * Cannot execute before
           * scheduled date.
           */
          if (
            runDate <
            recurring.nextRunAt
          ) {
            throw new AppError(
              "Recurring transaction is not due yet",
              409,
              "RECURRING_TRANSACTION_NOT_DUE"
            );
          }

          /*
           * End date.
           */
          if (
            recurring.endDate &&
            runDate >
              recurring.endDate
          ) {
            recurring.isActive =
              false;

            recurring.updatedBy =
              userId;

            await recurring.save({
              session
            });

            throw new AppError(
              "Recurring transaction has reached its end date",
              409,
              "RECURRING_TRANSACTION_EXPIRED"
            );
          }

          /*
           * Business.
           */
          const business =
            await Business.findOne({
              _id:
                businessId,

              isActive:
                true
            })
              .select(
                "_id currency"
              )
              .session(session);

          if (!business) {
            throw new AppError(
              "Business not found",
              404,
              "BUSINESS_NOT_FOUND"
            );
          }

          /*
           * Account/category validation
           * again at execution time.
           *
           * An account or category may
           * have become inactive after
           * the recurring rule was created.
           */
          const {
            account,
            category,
            destinationAccount
          } =
            await validateTransactionSetup({
              session,

              business,

              businessId,

              type:
                recurring.type,

              accountId:
                recurring.accountId,

              categoryId:
                recurring.categoryId,

              destinationAccountId:
                recurring.destinationAccountId
            });

          const amount =
            new Decimal(
              recurring.amount.toString()
            );

          /*
           * INCOME
           */
          if (
            recurring.type ===
            "income"
          ) {
            await Account.updateOne(
              {
                _id:
                  account._id,

                businessId,

                isActive:
                  true
              },
              {
                $inc: {
                  currentBalance:
                    toDecimal128(
                      amount
                    )
                }
              },
              {
                session
              }
            );
          }

          /*
           * EXPENSE
           */
          if (
            recurring.type ===
            "expense"
          ) {
            await Account.updateOne(
              {
                _id:
                  account._id,

                businessId,

                isActive:
                  true
              },
              {
                $inc: {
                  currentBalance:
                    toDecimal128(
                      amount.neg()
                    )
                }
              },
              {
                session
              }
            );
          }

          /*
           * TRANSFER
           */
          if (
            recurring.type ===
            "transfer"
          ) {
            await Account.updateOne(
              {
                _id:
                  account._id,

                businessId,

                isActive:
                  true
              },
              {
                $inc: {
                  currentBalance:
                    toDecimal128(
                      amount.neg()
                    )
                }
              },
              {
                session
              }
            );

            await Account.updateOne(
              {
                _id:
                  destinationAccount._id,

                businessId,

                isActive:
                  true
              },
              {
                $inc: {
                  currentBalance:
                    toDecimal128(
                      amount
                    )
                }
              },
              {
                session
              }
            );
          }

          /*
           * Create the normal transaction.
           *
           * This is what Dashboard and
           * Transaction APIs will see.
           */
          const transactionResult =
            await Transaction.create(
              [
                {
                  businessId,

                  type:
                    recurring.type,

                  amount:
                    toDecimal128(
                      amount
                    ),

                  currency:
                    business.currency,

                  accountId:
                    account._id,

                  categoryId:
                    category
                      ? category._id
                      : null,

                  destinationAccountId:
                    destinationAccount
                      ? destinationAccount._id
                      : null,

                  transactionDate:
                    runDate,

                  description:
                    recurring.description ||
                    null,

                  reference:
                    recurring.reference ||
                    null,

                  source:
                    "manual",

                  status:
                    "posted",

                  createdBy:
                    userId,

                  updatedBy:
                    userId
                }
              ],
              {
                session
              }
            );

          generatedTransaction =
            transactionResult[0];

          /*
           * Calculate next run.
           */
          const nextRunAt =
            calculateNextRun({
              currentDate:
                recurring.nextRunAt,

              frequency:
                recurring.frequency,

              intervalDays:
                recurring.intervalDays
            });

          recurring.executionCount +=
            1;

          recurring.lastTransactionId =
            generatedTransaction._id;

          recurring.nextRunAt =
            nextRunAt;

          recurring.updatedBy =
            userId;

          /*
           * If the next scheduled date
           * is beyond endDate, deactivate
           * the rule.
           */
          if (
            recurring.endDate &&
            nextRunAt >
              recurring.endDate
          ) {
            recurring.isActive =
              false;
          }

          await recurring.save({
            session
          });

          recurringIdForResponse =
            recurring._id;
        }
      );

      return {
        transaction:
          generatedTransaction,

        recurringTransactionId:
          recurringIdForResponse
      };
    } finally {
      await session.endSession();
    }
  };