import mongoose from "mongoose";
import Decimal from "decimal.js";
import InvoicePayment from "../models/InvoicePayment.js";
import BillPayment from "../models/BillPayment.js";
import Invoice from "../models/Invoice.js";
import Bill from "../models/Bill.js";
import Account from "../models/Account.js";
import Transaction from "../models/Transaction.js";
import { AppError } from "../utils/appError.js";
const d = (v) => new Decimal(v?.toString?.() ?? v ?? 0);
const d128 = (v) => mongoose.Types.Decimal128.fromString(d(v).toFixed(4));
export const reverseInvoicePayment = async ({
  businessId,
  paymentId,
  userId,
}) => {
  const s = await mongoose.startSession();
  try {
    let result;
    await s.withTransaction(async () => {
      const p = await InvoicePayment.findOne({
        _id: paymentId,
        businessId,
      }).session(s);
      if (!p)
        throw new AppError(
          "Invoice payment not found",
          404,
          "PAYMENT_NOT_FOUND",
        );
      if (p.reversedAt)
        throw new AppError(
          "Payment already reversed",
          409,
          "PAYMENT_ALREADY_REVERSED",
        );
      const inv = await Invoice.findOne({
        _id: p.invoiceId,
        businessId,
      }).session(s);
      const acc = await Account.findOne({
        _id: p.accountId,
        businessId,
      }).session(s);
      if (!inv || !acc)
        throw new AppError(
          "Payment dependencies not found",
          404,
          "PAYMENT_DEPENDENCY_NOT_FOUND",
        );
      const tx = await Transaction.create(
        [
          {
            businessId,
            type: "expense",
            amount: p.amount,
            currency: p.currency,
            accountId: acc._id,
            categoryId: null,
            transactionDate: new Date(),
            description: `Reversal of invoice payment ${p._id}`,
            reference: `REV-${p._id}`,
            source: "manual",
            status: "posted",
            createdBy: userId,
            updatedBy: userId,
          },
        ],
        { session: s },
      );
      await Account.updateOne(
        { _id: acc._id, businessId },
        {
          $inc: {
            currentBalance: mongoose.Types.Decimal128.fromString(
              d(p.amount).neg().toFixed(4),
            ),
          },
        },
        { session: s },
      );
      inv.paidAmount = d128(d(inv.paidAmount).sub(p.amount));
      inv.balanceDue = d128(d(inv.balanceDue).add(p.amount));
      inv.status = d(inv.paidAmount).eq(0) ? "sent" : "partially_paid";
      inv.updatedBy = userId;
      await inv.save({ session: s });
      p.reversedAt = new Date();
      p.reversalTransactionId = tx[0]._id;
      p.updatedBy = userId;
      await p.save({ session: s });
      result = { payment: p, transaction: tx[0], invoice: inv };
    });
    return result;
  } finally {
    await s.endSession();
  }
};
export const reverseBillPayment = async ({ businessId, paymentId, userId }) => {
  const s = await mongoose.startSession();
  try {
    let result;
    await s.withTransaction(async () => {
      const p = await BillPayment.findOne({
        _id: paymentId,
        businessId,
      }).session(s);
      if (!p)
        throw new AppError("Bill payment not found", 404, "PAYMENT_NOT_FOUND");
      if (p.reversedAt)
        throw new AppError(
          "Payment already reversed",
          409,
          "PAYMENT_ALREADY_REVERSED",
        );
      const bill = await Bill.findOne({ _id: p.billId, businessId }).session(s);
      const acc = await Account.findOne({
        _id: p.accountId,
        businessId,
      }).session(s);
      if (!bill || !acc)
        throw new AppError(
          "Payment dependencies not found",
          404,
          "PAYMENT_DEPENDENCY_NOT_FOUND",
        );
      const tx = await Transaction.create(
        [
          {
            businessId,
            type: "income",
            amount: p.amount,
            currency: p.currency,
            accountId: acc._id,
            categoryId: null,
            transactionDate: new Date(),
            description: `Reversal of bill payment ${p._id}`,
            reference: `REV-${p._id}`,
            source: "manual",
            status: "posted",
            createdBy: userId,
            updatedBy: userId,
          },
        ],
        { session: s },
      );
      await Account.updateOne(
        { _id: acc._id, businessId },
        { $inc: { currentBalance: d128(p.amount) } },
        { session: s },
      );
      bill.paidAmount = d128(d(bill.paidAmount).sub(p.amount));
      bill.balanceDue = d128(d(bill.balanceDue).add(p.amount));
      bill.status = d(bill.paidAmount).eq(0) ? "received" : "partially_paid";
      bill.updatedBy = userId;
      await bill.save({ session: s });
      p.reversedAt = new Date();
      p.reversalTransactionId = tx[0]._id;
      p.updatedBy = userId;
      await p.save({ session: s });
      result = { payment: p, transaction: tx[0], bill };
    });
    return result;
  } finally {
    await s.endSession();
  }
};
