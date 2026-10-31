import mongoose from "mongoose";
import Decimal from "decimal.js";
import Business from "../models/Bussiness.js";
import Account from "../models/Account.js";
import Category from "../models/Category.js";
import Transaction from "../models/Transaction.js";
import Invoice from "../models/Invoice.js";
import Bill from "../models/Bill.js";
import InventoryItem from "../models/InventoryItem.js";
import { AppError } from "../utils/appError.js";

const decimalString = (value) => {
  if (value === null || value === undefined) return "0";
  return value?.toString?.() ?? String(value);
};

const decimal = (value) => new Decimal(decimalString(value));
const objectId = (value) => new mongoose.Types.ObjectId(value);

const periodTotals = async ({ businessId, from, to }) => {
  const rows = await Transaction.aggregate([
    {
      $match: {
        businessId: objectId(businessId),
        status: "posted",
        type: { $in: ["income", "expense"] },
        transactionDate: { $gte: from, $lte: to },
      },
    },
    {
      $group: {
        _id: "$type",
        amount: { $sum: "$amount" },
        count: { $sum: 1 },
      },
    },
  ]);

  const totals = {
    income: new Decimal(0),
    expense: new Decimal(0),
    incomeCount: 0,
    expenseCount: 0,
  };
  for (const row of rows) {
    if (row._id === "income") {
      totals.income = decimal(row.amount);
      totals.incomeCount = row.count;
    }
    if (row._id === "expense") {
      totals.expense = decimal(row.amount);
      totals.expenseCount = row.count;
    }
  }
  return {
    totalIncome: totals.income.toFixed(4),
    totalExpenses: totals.expense.toFixed(4),
    netCashFlow: totals.income.minus(totals.expense).toFixed(4),
    incomeCount: totals.incomeCount,
    expenseCount: totals.expenseCount,
  };
};

export const getAIReferenceData = async ({ businessId }) => {
  const business = await Business.findOne({ _id: businessId, isActive: true })
    .select("name currency country timezone")
    .lean();
  if (!business) {
    throw new AppError("Business not found", 404, "BUSINESS_NOT_FOUND");
  }

  const [accounts, categories] = await Promise.all([
    Account.find({ businessId, isActive: true })
      .select("name type currency currentBalance")
      .sort({ name: 1 })
      .lean(),
    Category.find({ businessId, isActive: true })
      .select("name type description")
      .sort({ type: 1, name: 1 })
      .lean(),
  ]);

  return {
    business,
    accounts: accounts.map((account) => ({
      id: account._id.toString(),
      name: account.name,
      type: account.type,
      currency: account.currency,
      currentBalance: decimalString(account.currentBalance),
    })),
    categories: categories.map((category) => ({
      id: category._id.toString(),
      name: category.name,
      type: category.type,
      description: category.description || null,
    })),
  };
};

/**
 * A bounded, tenant-scoped snapshot. It deliberately excludes attachments,
 * emails, phone numbers, addresses, tax numbers, and full historical records.
 */
export const getAIBusinessSnapshot = async ({ businessId }) => {
  const now = new Date();
  const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const previous30Days = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

  const previousPeriodEnd = new Date(last30Days.getTime() - 1);
  const [reference, current, previous, categoryRows, recentTransactions, accounts, invoices, bills, inventory, invoiceSummaryRows, billSummaryRows] =
    await Promise.all([
      getAIReferenceData({ businessId }),
      periodTotals({ businessId, from: last30Days, to: now }),
      periodTotals({ businessId, from: previous30Days, to: previousPeriodEnd }),
      Transaction.aggregate([
        {
          $match: {
            businessId: objectId(businessId),
            status: "posted",
            transactionDate: { $gte: last30Days, $lte: now },
            type: { $in: ["income", "expense"] },
            categoryId: { $ne: null },
          },
        },
        {
          $group: {
            _id: { type: "$type", categoryId: "$categoryId" },
            amount: { $sum: "$amount" },
            count: { $sum: 1 },
          },
        },
        { $sort: { amount: -1 } },
        { $limit: 20 },
      ]),
      Transaction.find({
        businessId,
        status: "posted",
        transactionDate: { $gte: last30Days, $lte: now },
      })
        .select("type amount currency transactionDate description reference accountId categoryId")
        .populate("accountId", "name")
        .populate("categoryId", "name type")
        .sort({ transactionDate: -1 })
        .limit(20)
        .lean(),
      Account.find({ businessId, isActive: true })
        .select("name type currency currentBalance")
        .sort({ name: 1 })
        .lean(),
      Invoice.find({
        businessId,
        status: { $in: ["sent", "partially_paid"] },
      })
        .select("invoiceNumber issueDate dueDate currency totalAmount paidAmount balanceDue status customerId")
        .populate("customerId", "name")
        .sort({ dueDate: 1 })
        .limit(15)
        .lean(),
      Bill.find({
        businessId,
        status: { $in: ["received", "partially_paid"] },
      })
        .select("billNumber billDate dueDate currency totalAmount paidAmount balanceDue status vendorId")
        .populate("vendorId", "name")
        .sort({ dueDate: 1 })
        .limit(15)
        .lean(),
      InventoryItem.find({ businessId, isActive: true })
        .select("sku name unit quantity reorderLevel unitCost currency")
        .sort({ name: 1 })
        .limit(200)
        .lean(),
      Invoice.aggregate([
        { $match: { businessId: objectId(businessId), status: { $in: ["sent", "partially_paid"] } } },
        { $match: { $expr: { $gt: ["$balanceDue", { $toDecimal: "0" }] } } },
        {
          $group: {
            _id: null,
            total: { $sum: "$balanceDue" },
            count: { $sum: 1 },
            overdueTotal: { $sum: { $cond: [{ $lt: ["$dueDate", now] }, "$balanceDue", { $toDecimal: "0" }] } },
            overdueCount: { $sum: { $cond: [{ $lt: ["$dueDate", now] }, 1, 0] } },
          },
        },
      ]),
      Bill.aggregate([
        { $match: { businessId: objectId(businessId), status: { $in: ["received", "partially_paid"] } } },
        { $match: { $expr: { $gt: ["$balanceDue", { $toDecimal: "0" }] } } },
        {
          $group: {
            _id: null,
            total: { $sum: "$balanceDue" },
            count: { $sum: 1 },
            overdueTotal: { $sum: { $cond: [{ $lt: ["$dueDate", now] }, "$balanceDue", { $toDecimal: "0" }] } },
            overdueCount: { $sum: { $cond: [{ $lt: ["$dueDate", now] }, 1, 0] } },
          },
        },
      ]),
    ]);

  const categoryIds = categoryRows.map((row) => row._id.categoryId).filter(Boolean);
  const categoryDocs = categoryIds.length
    ? await Category.find({ _id: { $in: categoryIds }, businessId })
        .select("name type")
        .lean()
    : [];
  const categoryMap = new Map(categoryDocs.map((row) => [row._id.toString(), row]));

  const invoiceSummary = invoiceSummaryRows[0] || {};
  const billSummary = billSummaryRows[0] || {};
  const businessCurrencyAccounts = accounts.filter(
    (account) => account.currency === reference.business.currency,
  );
  const totalBusinessCurrencyBalance = businessCurrencyAccounts.reduce(
    (total, account) => total.plus(decimal(account.currentBalance)),
    new Decimal(0),
  );
  const openInvoices = invoices.filter((row) => decimal(row.balanceDue).greaterThan(0));
  const openBills = bills.filter((row) => decimal(row.balanceDue).greaterThan(0));
  const lowStock = inventory
    .filter((item) => decimal(item.quantity).lessThanOrEqualTo(decimal(item.reorderLevel)))
    .slice(0, 30)
    .map((item) => ({
      sku: item.sku,
      name: item.name,
      unit: item.unit,
      quantity: decimalString(item.quantity),
      reorderLevel: decimalString(item.reorderLevel),
      unitCost: decimalString(item.unitCost),
      currency: item.currency,
    }));

  return {
    business: {
      name: reference.business.name,
      currency: reference.business.currency,
      country: reference.business.country || null,
      timezone: reference.business.timezone || "Asia/Karachi",
    },
    generatedAt: now.toISOString(),
    period: {
      current: { label: "Last 30 days", from: last30Days.toISOString(), to: now.toISOString(), ...current },
      previous: { label: "Previous 30 days", from: previous30Days.toISOString(), to: last30Days.toISOString(), ...previous },
    },
    accounts: accounts.map((account) => ({
      name: account.name,
      type: account.type,
      currency: account.currency,
      balance: decimalString(account.currentBalance),
    })),
    accountSummary: {
      businessCurrency: reference.business.currency,
      totalBalance: totalBusinessCurrencyBalance.toFixed(4),
      includedAccounts: businessCurrencyAccounts.length,
      excludedForeignCurrencyAccounts: accounts.length - businessCurrencyAccounts.length,
    },
    categoryBreakdown: categoryRows.map((row) => ({
      type: row._id.type,
      category: categoryMap.get(row._id.categoryId.toString())?.name || "Uncategorized",
      amount: decimalString(row.amount),
      transactionCount: row.count,
    })),
    recentTransactions: recentTransactions.map((row) => ({
      type: row.type,
      amount: decimalString(row.amount),
      currency: row.currency,
      date: row.transactionDate?.toISOString?.() || null,
      description: row.description || null,
      account: row.accountId?.name || "Unknown account",
      category: row.categoryId?.name || null,
    })),
    receivables: {
      outstandingTotal: decimalString(invoiceSummary.total),
      currency: reference.business.currency,
      openCount: invoiceSummary.count || 0,
      overdueTotal: decimalString(invoiceSummary.overdueTotal),
      overdueCount: invoiceSummary.overdueCount || 0,
      overdue: openInvoices
        .filter((row) => row.dueDate && row.dueDate < now)
        .slice(0, 10)
        .map((row) => ({
          invoiceNumber: row.invoiceNumber,
          customer: row.customerId?.name || "Unknown customer",
          dueDate: row.dueDate.toISOString(),
          balanceDue: decimalString(row.balanceDue),
        })),
    },
    payables: {
      outstandingTotal: decimalString(billSummary.total),
      currency: reference.business.currency,
      openCount: billSummary.count || 0,
      overdueTotal: decimalString(billSummary.overdueTotal),
      overdueCount: billSummary.overdueCount || 0,
      overdue: openBills
        .filter((row) => row.dueDate && row.dueDate < now)
        .slice(0, 10)
        .map((row) => ({
          billNumber: row.billNumber,
          vendor: row.vendorId?.name || "Unknown vendor",
          dueDate: row.dueDate.toISOString(),
          balanceDue: decimalString(row.balanceDue),
        })),
    },
    lowStockItems: lowStock,
  };
};

export const getAIReportSnapshot = async ({ businessId, from, to }) => {
  const start = new Date(from);
  const end = new Date(to);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) {
    throw new AppError("Invalid report date range", 400, "INVALID_REPORT_RANGE");
  }
  if (end.getTime() - start.getTime() > 366 * 24 * 60 * 60 * 1000) {
    throw new AppError("AI report range cannot exceed 366 days", 400, "REPORT_RANGE_TOO_LARGE");
  }

  const [totals, categoryRows, count] = await Promise.all([
    periodTotals({ businessId, from: start, to: end }),
    Transaction.aggregate([
      {
        $match: {
          businessId: objectId(businessId),
          status: "posted",
          transactionDate: { $gte: start, $lte: end },
          type: { $in: ["income", "expense"] },
          categoryId: { $ne: null },
        },
      },
      {
        $group: {
          _id: { type: "$type", categoryId: "$categoryId" },
          amount: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
      { $sort: { amount: -1 } },
      { $limit: 30 },
    ]),
    Transaction.countDocuments({
      businessId,
      status: "posted",
      transactionDate: { $gte: start, $lte: end },
    }),
  ]);

  const ids = categoryRows.map((row) => row._id.categoryId).filter(Boolean);
  const categories = ids.length
    ? await Category.find({ _id: { $in: ids }, businessId }).select("name type").lean()
    : [];
  const names = new Map(categories.map((category) => [category._id.toString(), category.name]));

  return {
    currency: (await Business.findById(businessId).select("currency").lean())?.currency || "",
    from: start.toISOString(),
    to: end.toISOString(),
    totals,
    transactionCount: count,
    categoryBreakdown: categoryRows.map((row) => ({
      type: row._id.type,
      category: names.get(row._id.categoryId.toString()) || "Uncategorized",
      amount: decimalString(row.amount),
      count: row.count,
    })),
  };
};
