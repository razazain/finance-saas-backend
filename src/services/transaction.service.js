import mongoose from "mongoose";

import Transaction from "../models/Transaction.js";
import Account from "../models/Account.js";
import Category from "../models/Category.js";
import Business from "../models/Bussiness.js";

import { AppError } from "../utils/appError.js";

export const createTransaction =
  async ({
    businessId,
    userId,
    type,
    amount,
    accountId,
    categoryId,
    destinationAccountId,
    transactionDate,
    description,
    reference
  }) => {
    const session =
      await mongoose.startSession();

    try {
      let createdTransaction;

      await session.withTransaction(
        async () => {
          /*
           * Verify business.
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
           * Convert amount into Decimal128
           * only after validation.
           */
          const decimalAmount =
            mongoose.Types.Decimal128.fromString(
              amount
            );

          /*
           * Load source account.
           *
           * businessId is ALWAYS taken
           * from authenticated context.
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

          /*
           * Account currency must match
           * transaction currency.
           *
           * For now, transactions do not
           * perform currency conversion.
           */
          if (
            account.currency !==
            business.currency
          ) {
            throw new AppError(
              "Account currency does not match the business currency",
              400,
              "ACCOUNT_CURRENCY_MISMATCH"
            );
          }

          /*
           * Use account currency as the
           * transaction currency.
           */
          const currency =
            account.currency;

          /*
           * INCOME / EXPENSE
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

            const category =
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

            /*
             * Income must use income
             * category.
             */
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

            /*
             * Calculate account balance.
             *
             * Income:
             * balance + amount
             *
             * Expense:
             * balance - amount
             */
            const balanceOperator =
              type === "income"
                ? "$inc"
                : "$inc";

            const balanceChange =
              type === "income"
                ? decimalAmount
                : mongoose.Types.Decimal128.fromString(
                    `-${amount}`
                  );

            await Account.updateOne(
              {
                _id: account._id,
                businessId,
                isActive: true
              },
              {
                $inc: {
                  currentBalance:
                    balanceChange
                }
              },
              {
                session
              }
            );

            createdTransaction =
              await Transaction.create(
                [
                  {
                    businessId,

                    type,

                    amount:
                      decimalAmount,

                    currency,

                    accountId:

                      account._id,

                    categoryId:
                      category._id,

                    destinationAccountId:
                      null,

                    transactionDate:
                      new Date(
                        transactionDate
                      ),

                    description:
                      description ||
                      null,

                    reference:
                      reference ||
                      null,

                    source: "manual",

                    status: "posted",

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

            createdTransaction =
              createdTransaction[0];

            return;
          }

          /*
           * TRANSFER
           */
          if (type === "transfer") {
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

            const destinationAccount =
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

            /*
             * We currently support only
             * same-currency transfers.
             */
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

            /*
             * Source:
             * balance - amount
             */
            await Account.updateOne(
              {
                _id:
                  account._id,
                businessId,
                isActive: true
              },
              {
                $inc: {
                  currentBalance:
                    mongoose.Types.Decimal128.fromString(
                      `-${amount}`
                    )
                }
              },
              {
                session
              }
            );

            /*
             * Destination:
             * balance + amount
             */
            await Account.updateOne(
              {
                _id:
                  destinationAccount._id,
                businessId,
                isActive: true
              },
              {
                $inc: {
                  currentBalance:
                    decimalAmount
                }
              },
              {
                session
              }
            );

            createdTransaction =
              await Transaction.create(
                [
                  {
                    businessId,

                    type: "transfer",

                    amount:
                      decimalAmount,

                    currency:
                      account.currency,

                    accountId:
                      account._id,

                    categoryId:
                      null,

                    destinationAccountId:
                      destinationAccount._id,

                    transactionDate:
                      new Date(
                        transactionDate
                      ),

                    description:
                      description ||
                      null,

                    reference:
                      reference ||
                      null,

                    source: "manual",

                    status: "posted",

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

            createdTransaction =
              createdTransaction[0];

            return;
          }

          throw new AppError(
            "Unsupported transaction type",
            400,
            "INVALID_TRANSACTION_TYPE"
          );
        }
      );

      return formatTransaction(
        createdTransaction
      );
    } finally {
      await session.endSession();
    }
  };

export const getTransactions =
  async ({
    businessId,
    type,
    status,
    accountId,
    categoryId,
    from,
    to,
    page = 1,
    limit = 25
  }) => {
    const filter = {
      businessId
    };

    if (type) {
      filter.type = type;
    }

    if (status) {
      filter.status = status;
    }

    if (accountId) {
      filter.$or = [
        {
          accountId
        },
        {
          destinationAccountId:
            accountId
        }
      ];
    }

    if (categoryId) {
      filter.categoryId =
        categoryId;
    }

    if (from || to) {
      filter.transactionDate =
        {};

      if (from) {
        filter.transactionDate.$gte =
          new Date(from);
      }

      if (to) {
        filter.transactionDate.$lte =
          new Date(to);
      }
    }

    const skip =
      (page - 1) *
      limit;

    const [
      transactions,
      total
    ] = await Promise.all([
      Transaction.find(filter)
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
          "_id name email"
        )
        .populate(
          "voidedBy",
          "_id name email"
        )
        .sort({
          transactionDate: -1,
          createdAt: -1
        })
        .skip(skip)
        .limit(limit),

      Transaction.countDocuments(
        filter
      )
    ]);

    return {
      transactions:
        transactions.map(
          formatTransaction
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

export const getTransactionById =
  async ({
    businessId,
    transactionId
  }) => {
    const transaction =
      await Transaction.findOne({
        _id: transactionId,
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
          "_id name email"
        )
        .populate(
          "updatedBy",
          "_id name email"
        )
        .populate(
          "voidedBy",
          "_id name email"
        );

    if (!transaction) {
      throw new AppError(
        "Transaction not found",
        404,
        "TRANSACTION_NOT_FOUND"
      );
    }

    return formatTransaction(
      transaction
    );
  };

export const voidTransaction =
  async ({
    businessId,
    transactionId,
    userId,
    reason
  }) => {
    const session =
      await mongoose.startSession();

    try {
      let transaction;

      await session.withTransaction(
        async () => {
          transaction =
            await Transaction.findOne({
              _id: transactionId,
              businessId
            }).session(session);

          if (!transaction) {
            throw new AppError(
              "Transaction not found",
              404,
              "TRANSACTION_NOT_FOUND"
            );
          }

          if (
            transaction.status ===
            "voided"
          ) {
            throw new AppError(
              "Transaction is already voided",
              409,
              "TRANSACTION_ALREADY_VOIDED"
            );
          }

          const amount =
            transaction.amount;

          /*
           * Reverse income/expense.
           */
          if (
            transaction.type ===
              "income" ||
            transaction.type ===
              "expense"
          ) {
            const account =
              await Account.findOne({
                _id:
                  transaction.accountId,
                businessId
              }).session(session);

            if (!account) {
              throw new AppError(
                "Transaction account not found",
                404,
                "ACCOUNT_NOT_FOUND"
              );
            }

            /*
             * Reverse:
             *
             * income:
             * original +amount
             * reversal -amount
             *
             * expense:
             * original -amount
             * reversal +amount
             */
            const reversal =
              transaction.type ===
              "income"
                ? mongoose.Types.Decimal128.fromString(
                    `-${amount.toString()}`
                  )
                : amount;

            await Account.updateOne(
              {
                _id:
                  account._id,
                businessId
              },
              {
                $inc: {
                  currentBalance:
                    reversal
                }
              },
              {
                session
              }
            );
          }

          /*
           * Reverse transfer.
           *
           * Source originally:
           * -amount
           *
           * Destination originally:
           * +amount
           *
           * Reverse:
           * source +amount
           * destination -amount
           */
          if (
            transaction.type ===
            "transfer"
          ) {
            const sourceAccount =
              await Account.findOne({
                _id:
                  transaction.accountId,
                businessId
              }).session(session);

            const destinationAccount =
              await Account.findOne({
                _id:
                  transaction.destinationAccountId,
                businessId
              }).session(session);

            if (
              !sourceAccount ||
              !destinationAccount
            ) {
              throw new AppError(
                "Transfer accounts could not be found",
                404,
                "TRANSFER_ACCOUNT_NOT_FOUND"
              );
            }

            await Account.updateOne(
              {
                _id:
                  sourceAccount._id,
                businessId
              },
              {
                $inc: {
                  currentBalance:
                    amount
                }
              },
              {
                session
              }
            );

            await Account.updateOne(
              {
                _id:
                  destinationAccount
                    ._id,
                businessId
              },
              {
                $inc: {
                  currentBalance:
                    mongoose.Types.Decimal128.fromString(
                      `-${amount.toString()}`
                    )
                }
              },
              {
                session
              }
            );
          }

          transaction.status =
            "voided";

          transaction.voidedAt =
            new Date();

          transaction.voidedBy =
            userId;

          transaction.voidReason =
            reason;

          transaction.updatedBy =
            userId;

          await transaction.save({
            session
          });
        }
      );

      return formatTransaction(
        transaction
      );
    } finally {
      await session.endSession();
    }
  };

const formatDecimal =
  (value) => {
    if (
      value === null ||
      value === undefined
    ) {
      return "0";
    }

    return value.toString();
  };

const formatTransaction =
  (transaction) => {
    const object =
      transaction.toObject
        ? transaction.toObject()
        : transaction;

    return {
      ...object,

      amount:
        formatDecimal(
          object.amount
        )
    };
  };