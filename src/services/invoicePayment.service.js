import mongoose from "mongoose";
import Decimal from "decimal.js";
import Invoice from "../models/Invoice.js";
import InvoicePayment from "../models/InvoicePayment.js";
import Account from "../models/Account.js";
import Category from "../models/Category.js";
import Transaction from "../models/Transaction.js";
import Business from "../models/Bussiness.js";

import { AppError } from "../utils/appError.js";

const decimalToString = (value) => {
  if (value === null || value === undefined) {
    return "0";
  }

  return value.toString();
};

const formatPayment = (payment) => {
  const object = payment.toObject ? payment.toObject() : payment;

  return {
    ...object,

    amount: decimalToString(object.amount),
  };
};

/*
 * CREATE INVOICE PAYMENT
 *
 * Invoice
 *   ↓
 * Payment
 *   ↓
 * Income Transaction
 *   ↓
 * Account Balance
 */
export const createInvoicePayment = async ({
  businessId,
  invoiceId,
  userId,
  accountId,
  categoryId,
  amount,
  paymentDate,
  reference,
  notes,
}) => {
  const session = await mongoose.startSession();

  try {
    let createdPayment;

    await session.withTransaction(async () => {
      /*
       * 1. Verify business.
       */
      const business = await Business.findOne({
        _id: businessId,
        isActive: true,
      })
        .select("_id currency")
        .session(session);

      if (!business) {
        throw new AppError("Business not found", 404, "BUSINESS_NOT_FOUND");
      }

      /*
       * 2. Find invoice.
       */
      const invoice = await Invoice.findOne({
        _id: invoiceId,
        businessId,
      }).session(session);

      if (!invoice) {
        throw new AppError("Invoice not found", 404, "INVOICE_NOT_FOUND");
      }

      /*
       * 3. Invoice cannot be
       * cancelled or already paid.
       */
      if (invoice.status === "cancelled") {
        throw new AppError(
          "Cancelled invoices cannot receive payments",
          409,
          "CANCELLED_INVOICE",
        );
      }

      if (invoice.status === "paid") {
        throw new AppError(
          "Invoice is already fully paid",
          409,
          "INVOICE_ALREADY_PAID",
        );
      }

      /*
       * Payments should normally
       * happen after invoice is sent.
       *
       * We allow partially_paid as well.
       */
      if (invoice.status !== "sent" && invoice.status !== "partially_paid") {
        throw new AppError(
          "Only sent invoices can receive payments",
          409,
          "INVALID_INVOICE_PAYMENT_STATUS",
        );
      }

      /*
       * 4. Currency must match
       * business and invoice.
       */
      if (invoice.currency !== business.currency) {
        throw new AppError(
          "Invoice currency does not match business currency",
          400,
          "INVOICE_CURRENCY_MISMATCH",
        );
      }

      /*
       * 5. Convert payment amount.
       */
      const decimalAmount = mongoose.Types.Decimal128.fromString(amount);

      /*
       * 6. Prevent overpayment.
       */
      const currentBalance = invoice.balanceDue;

      const balanceDueNumber = new Decimal(currentBalance.toString());

      const paymentNumber = parseFloat(paymentAmount.toString());

      if (paymentNumber > balanceDueNumber) {
        throw new AppError(
          "Payment cannot be greater than invoice balance due",
          400,
          "PAYMENT_EXCEEDS_BALANCE",
        );
      }

      /*
       * 7. Validate account.
       */
      const account = await Account.findOne({
        _id: accountId,
        businessId,
        isActive: true,
      }).session(session);

      if (!account) {
        throw new AppError(
          "Account not found or inactive",
          404,
          "ACCOUNT_NOT_FOUND",
        );
      }

      if (account.currency !== business.currency) {
        throw new AppError(
          "Account currency does not match business currency",
          400,
          "ACCOUNT_CURRENCY_MISMATCH",
        );
      }

      /*
       * 8. Validate income category.
       */
      const category = await Category.findOne({
        _id: categoryId,
        businessId,
        isActive: true,
        type: "income",
      }).session(session);

      if (!category) {
        throw new AppError(
          "Income category not found or inactive",
          404,
          "CATEGORY_NOT_FOUND",
        );
      }

      /*
       * 9. Calculate new invoice values.
       *
       * Decimal128 values are used
       * for database calculations.
       */
      const currentPaid = new Decimal(invoice.paidAmount.toString());

      const currentDue = new Decimal(invoice.balanceDue.toString());

      const paymentAmount = new Decimal(amount);

      const newPaid = currentPaid.add(paymentAmount);

      const newBalance = currentDue.sub(paymentAmount);

      /*
       * Avoid tiny floating point
       * residue.
       */
      const normalizedBalance =
        Math.abs(Number(newBalance)) < 0.0001 ? "0.0000" : newBalance;

      /*
       * 10. Update account balance.
       *
       * Customer payment is income.
       */
      await Account.updateOne(
        {
          _id: account._id,
          businessId,
          isActive: true,
        },
        {
          $inc: {
            currentBalance: decimalAmount,
          },
        },
        {
          session,
        },
      );

      /*
       * 11. Create income transaction.
       */
      const transactionResult = await Transaction.create(
        [
          {
            businessId,

            type: "income",

            amount: decimalAmount,

            currency: business.currency,

            accountId: account._id,

            categoryId: category._id,

            destinationAccountId: null,

            transactionDate: new Date(paymentDate),

            description: `Payment received for invoice ${invoice.invoiceNumber}`,

            reference: reference || invoice.invoiceNumber,

            source: "manual",

            status: "posted",

            createdBy: userId,

            updatedBy: userId,
          },
        ],
        {
          session,
        },
      );

      const transaction = transactionResult[0];

      /*
       * 12. Create payment record.
       */
      const payment = new InvoicePayment({
        businessId,

        invoiceId: invoice._id,

        customerId: invoice.customerId,

        accountId: account._id,

        categoryId: category._id,

        amount: decimalAmount,

        currency: business.currency,

        paymentDate: new Date(paymentDate),

        reference: reference || null,

        notes: notes || null,

        transactionId: transaction._id,

        createdBy: userId,

        updatedBy: userId,
      });

      await payment.save({
        session,
      });

      /*
       * 13. Update invoice.
       */
      invoice.paidAmount = mongoose.Types.Decimal128.fromString(newPaid);

      invoice.balanceDue =
        mongoose.Types.Decimal128.fromString(normalizedBalance);

      /*
       * Fully paid.
       */
      if (Number(normalizedBalance) === 0) {
        invoice.status = "paid";
      } else {
        invoice.status = "partially_paid";
      }

      invoice.updatedBy = userId;

      await invoice.save({
        session,
      });

      createdPayment = payment;
    });

    /*
     * Return payment with
     * useful populated data.
     */
    const payment = await InvoicePayment.findOne({
      _id: createdPayment._id,
      businessId,
    })
      .populate(
        "invoiceId",
        "_id invoiceNumber totalAmount paidAmount balanceDue status",
      )
      .populate("customerId", "_id name type email phone companyName")
      .populate("accountId", "_id name type currency currentBalance")
      .populate("categoryId", "_id name type")
      .populate(
        "transactionId",
        "_id type amount currency accountId transactionDate reference status",
      );

    return formatPayment(payment);
  } finally {
    await session.endSession();
  }
};

/*
 * LIST PAYMENTS FOR AN INVOICE
 */
export const getInvoicePayments = async ({ businessId, invoiceId }) => {
  const invoice = await Invoice.findOne({
    _id: invoiceId,
    businessId,
  }).select("_id invoiceNumber totalAmount paidAmount balanceDue status");

  if (!invoice) {
    throw new AppError("Invoice not found", 404, "INVOICE_NOT_FOUND");
  }

  const payments = await InvoicePayment.find({
    businessId,
    invoiceId,
  })
    .populate("accountId", "_id name type currency")
    .populate("categoryId", "_id name type")
    .populate("createdBy", "_id name email")
    .sort({
      paymentDate: -1,
      createdAt: -1,
    });

  return {
    invoice: {
      _id: invoice._id,

      invoiceNumber: invoice.invoiceNumber,

      totalAmount: decimalToString(invoice.totalAmount),

      paidAmount: decimalToString(invoice.paidAmount),

      balanceDue: decimalToString(invoice.balanceDue),

      status: invoice.status,
    },

    payments: payments.map(formatPayment),
  };
};

/*
 * GET SINGLE PAYMENT
 */
export const getInvoicePaymentById = async ({ businessId, paymentId }) => {
  const payment = await InvoicePayment.findOne({
    _id: paymentId,
    businessId,
  })
    .populate(
      "invoiceId",
      "_id invoiceNumber totalAmount paidAmount balanceDue status",
    )
    .populate("customerId", "_id name type email phone companyName")
    .populate("accountId", "_id name type currency")
    .populate("categoryId", "_id name type")
    .populate(
      "transactionId",
      "_id type amount currency accountId transactionDate reference status",
    )
    .populate("createdBy", "_id name email");

  if (!payment) {
    throw new AppError("Invoice payment not found", 404, "PAYMENT_NOT_FOUND");
  }

  return formatPayment(payment);
};
