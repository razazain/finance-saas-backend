import mongoose from "mongoose";
import Decimal from "decimal.js";

import Bill from "../models/Bill.js";
import BillPayment from "../models/BillPayment.js";
import Account from "../models/Account.js";
import Category from "../models/Category.js";
import Transaction from "../models/Transaction.js";
import Business from "../models/Bussiness.js";

import { AppError } from "../utils/appError.js";

Decimal.set({
  precision: 40,
  rounding: Decimal.ROUND_HALF_UP
});

/*
 * Decimal -> Decimal128
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
 * Decimal128 -> string
 */
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

/*
 * Format payment response.
 */
const formatPayment =
  (payment) => {
    const object =
      payment.toObject
        ? payment.toObject()
        : payment;

    return {
      ...object,

      amount:
        decimalToString(
          object.amount
        )
    };
  };

/*
 * CREATE BILL PAYMENT
 */
export const createBillPayment =
  async ({
    businessId,
    billId,
    userId,
    accountId,
    categoryId,
    amount,
    paymentDate,
    reference,
    notes
  }) => {
    const session =
      await mongoose.startSession();

    try {
      let createdPayment;

      await session.withTransaction(
        async () => {
          /*
           * 1. Verify business.
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
           * 2. Find bill.
           */
          const bill =
            await Bill.findOne({
              _id: billId,
              businessId
            }).session(session);

          if (!bill) {
            throw new AppError(
              "Bill not found",
              404,
              "BILL_NOT_FOUND"
            );
          }

          /*
           * 3. Cancelled bills cannot
           * receive payments.
           */
          if (
            bill.status ===
            "cancelled"
          ) {
            throw new AppError(
              "Cancelled bills cannot receive payments",
              409,
              "CANCELLED_BILL"
            );
          }

          /*
           * 4. Already paid.
           */
          if (
            bill.status ===
            "paid"
          ) {
            throw new AppError(
              "Bill is already fully paid",
              409,
              "BILL_ALREADY_PAID"
            );
          }

          /*
           * Payments are allowed only
           * after bill is received or
           * after a previous payment.
           */
          if (
            bill.status !==
              "received" &&
            bill.status !==
              "partially_paid"
          ) {
            throw new AppError(
              "Only received bills can receive payments",
              409,
              "INVALID_BILL_PAYMENT_STATUS"
            );
          }

          /*
           * 5. Currency validation.
           */
          if (
            bill.currency !==
            business.currency
          ) {
            throw new AppError(
              "Bill currency does not match business currency",
              400,
              "BILL_CURRENCY_MISMATCH"
            );
          }

          /*
           * 6. Convert amount using
           * Decimal.js.
           */
          const paymentAmount =
            new Decimal(
              amount
            );

          if (
            paymentAmount.lte(0)
          ) {
            throw new AppError(
              "Payment amount must be greater than 0",
              400,
              "INVALID_PAYMENT_AMOUNT"
            );
          }

          /*
           * 7. Check overpayment using
           * Decimal.js.
           */
          const balanceDue =
            new Decimal(
              bill.balanceDue.toString()
            );

          if (
            paymentAmount.gt(
              balanceDue
            )
          ) {
            throw new AppError(
              "Payment cannot be greater than bill balance due",
              400,
              "PAYMENT_EXCEEDS_BALANCE"
            );
          }

          /*
           * 8. Validate account.
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
           * business currency.
           */
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

          /*
           * 9. Validate expense category.
           */
          const category =
            await Category.findOne({
              _id: categoryId,
              businessId,
              isActive: true,
              type: "expense"
            }).session(session);

          if (!category) {
            throw new AppError(
              "Expense category not found or inactive",
              404,
              "CATEGORY_NOT_FOUND"
            );
          }

          /*
           * 10. Calculate new bill values.
           */
          const currentPaid =
            new Decimal(
              bill.paidAmount.toString()
            );

          const newPaid =
            currentPaid.add(
              paymentAmount
            );

          const newBalance =
            balanceDue.sub(
              paymentAmount
            );

          /*
           * Normalize very small
           * decimal residue.
           */
          const normalizedBalance =
            newBalance
              .abs()
              .lt(
                new Decimal("0.0001")
              )
              ? ZERO_STRING
              : newBalance.toFixed(4);

          /*
           * 11. Decrease account balance.
           *
           * Vendor payment = expense.
           */
          const negativeAmount =
            toDecimal128(
              paymentAmount.neg()
            );

          const accountUpdate =
            await Account.updateOne(
              {
                _id: account._id,
                businessId,
                isActive: true
              },
              {
                $inc: {
                  currentBalance:
                    negativeAmount
                }
              },
              {
                session
              }
            );

          if (
            accountUpdate.modifiedCount !==
            1
          ) {
            throw new AppError(
              "Failed to update account balance",
              500,
              "ACCOUNT_UPDATE_FAILED"
            );
          }

          /*
           * 12. Create expense transaction.
           */
          const transactionResult =
            await Transaction.create(
              [
                {
                  businessId,

                  type:
                    "expense",

                  amount:
                    toDecimal128(
                      paymentAmount
                    ),

                  currency:
                    business.currency,

                  accountId:
                    account._id,

                  categoryId:
                    category._id,

                  destinationAccountId:
                    null,

                  transactionDate:
                    new Date(
                      paymentDate
                    ),

                  description:
                    `Payment made for bill ${bill.billNumber}`,

                  reference:
                    reference ||
                    bill.billNumber,

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

          const transaction =
            transactionResult[0];

          /*
           * 13. Create payment record.
           */
          const payment =
            new BillPayment({
              businessId,

              billId:
                bill._id,

              vendorId:
                bill.vendorId,

              accountId:
                account._id,

              categoryId:
                category._id,

              amount:
                toDecimal128(
                  paymentAmount
                ),

              currency:
                business.currency,

              paymentDate:
                new Date(
                  paymentDate
                ),

              reference:
                reference ||
                null,

              notes:
                notes ||
                null,

              transactionId:
                transaction._id,

              createdBy:
                userId,

              updatedBy:
                userId
            });

          await payment.save({
            session
          });

          /*
           * 14. Update bill.
           */
          bill.paidAmount =
            toDecimal128(
              newPaid
            );

          bill.balanceDue =
            toDecimal128(
              normalizedBalance
            );

          if (
            newBalance.lte(0)
          ) {
            bill.status =
              "paid";
          } else {
            bill.status =
              "partially_paid";
          }

          bill.updatedBy =
            userId;

          await bill.save({
            session
          });

          createdPayment =
            payment;
        }
      );

      /*
       * Fetch populated payment after
       * transaction has committed.
       */
      const payment =
        await BillPayment.findOne({
          _id:
            createdPayment._id,

          businessId
        })
          .populate(
            "billId",
            "_id billNumber totalAmount paidAmount balanceDue status dueDate"
          )
          .populate(
            "vendorId",
            "_id name type email phone companyName"
          )
          .populate(
            "accountId",
            "_id name type currency currentBalance"
          )
          .populate(
            "categoryId",
            "_id name type"
          )
          .populate(
            "transactionId",
            "_id type amount currency accountId transactionDate reference status"
          );

      return formatPayment(
        payment
      );
    } finally {
      await session.endSession();
    }
  };

const ZERO_STRING =
  "0.0000";

/*
 * GET PAYMENTS FOR BILL
 */
export const getBillPayments =
  async ({
    businessId,
    billId
  }) => {
    const bill =
      await Bill.findOne({
        _id: billId,
        businessId
      })
        .select(
          "_id billNumber totalAmount paidAmount balanceDue status"
        );

    if (!bill) {
      throw new AppError(
        "Bill not found",
        404,
        "BILL_NOT_FOUND"
      );
    }

    const payments =
      await BillPayment.find({
        businessId,
        billId
      })
        .populate(
          "accountId",
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
        .sort({
          paymentDate: -1,
          createdAt: -1
        });

    return {
      bill: {
        _id:
          bill._id,

        billNumber:
          bill.billNumber,

        totalAmount:
          decimalToString(
            bill.totalAmount
          ),

        paidAmount:
          decimalToString(
            bill.paidAmount
          ),

        balanceDue:
          decimalToString(
            bill.balanceDue
          ),

        status:
          bill.status
      },

      payments:
        payments.map(
          formatPayment
        )
    };
  };

/*
 * GET SINGLE PAYMENT
 */
export const getBillPaymentById =
  async ({
    businessId,
    paymentId
  }) => {
    const payment =
      await BillPayment.findOne({
        _id: paymentId,
        businessId
      })
        .populate(
          "billId",
          "_id billNumber totalAmount paidAmount balanceDue status dueDate"
        )
        .populate(
          "vendorId",
          "_id name type email phone companyName"
        )
        .populate(
          "accountId",
          "_id name type currency currentBalance"
        )
        .populate(
          "categoryId",
          "_id name type"
        )
        .populate(
          "transactionId",
          "_id type amount currency accountId transactionDate reference status"
        )
        .populate(
          "createdBy",
          "_id name email"
        );

    if (!payment) {
      throw new AppError(
        "Bill payment not found",
        404,
        "BILL_PAYMENT_NOT_FOUND"
      );
    }

    return formatPayment(
      payment
    );
  };