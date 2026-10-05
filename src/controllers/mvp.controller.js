import Decimal from "decimal.js";
import mongoose from "mongoose";
import User from "../models/User.js";
import Business from "../models/Bussiness.js";
import Notification from "../models/Notification.js";
import Subscription from "../models/Subscription.js";
import InventoryItem from "../models/InventoryItem.js";
import InventoryMovement from "../models/InventoryMovement.js";
import CurrencyRate from "../models/CurrencyRate.js";
import Invoice from "../models/Invoice.js";
import Bill from "../models/Bill.js";
import Transaction from "../models/Transaction.js";
import InvoicePayment from "../models/InvoicePayment.js";
import BillPayment from "../models/BillPayment.js";
import Account from "../models/Account.js";
import Category from "../models/Category.js";
import Party from "../models/Party.js";
import { createPdfBuffer } from "../utils/simplePdf.js";
import { sendEmail } from "../utils/mailer.js";
import { AppError } from "../utils/appError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { successResponse } from "../utils/response.js";
import { processDocumentWithOcr } from "../services/ocr.service.js";
import Document from "../models/Document.js";

const dec = (v) => new Decimal(v?.toString?.() ?? v ?? 0);
const ds = (v) => dec(v).toFixed(4);
const send = (res, data, message = "Success", statusCode = 200) =>
  successResponse({ res, data, message, statusCode });
const csv = (headers, rows) =>
  [
    headers.join(","),
    ...rows.map((r) =>
      r.map((v) => `"${String(v ?? "").replaceAll('"', '""')}"`).join(","),
    ),
  ].join("\n");

export const exportTransactions = asyncHandler(async (req, res) => {
  const { from, to, type } = req.query;
  const q = { businessId: req.user.businessId };
  if (type) q.type = type;
  if (from || to)
    q.transactionDate = {
      ...(from ? { $gte: new Date(from) } : {}),
      ...(to ? { $lte: new Date(to) } : {}),
    };
  const rows = await Transaction.find(q)
    .sort({ transactionDate: 1 })
    .limit(10000);
  const body = csv(
    [
      "Date",
      "Type",
      "Amount",
      "Currency",
      "Account",
      "Description",
      "Reference",
      "Status",
    ],
    rows.map((x) => [
      x.transactionDate.toISOString(),
      x.type,
      x.amount,
      x.currency,
      x.accountId,
      x.description,
      x.reference,
      x.status,
    ]),
  );
  res.set("Content-Type", "text/csv; charset=utf-8");
  res.set("Content-Disposition", "attachment; filename=transactions.csv");
  return res.send(body);
});
export const exportTransactionsPdf = asyncHandler(async (req, res) => {
  const rows = await Transaction.find({ businessId: req.user.businessId })
    .sort({ transactionDate: -1 })
    .limit(100);
  const pdf = createPdfBuffer({
    title: "Finance SaaS - Transactions",
    rows: rows.map(
      (x) =>
        `${x.transactionDate.toISOString()} | ${x.type} | ${x.amount} ${x.currency} | ${x.description || ""}`,
    ),
  });
  res.set("Content-Type", "application/pdf");
  res.set("Content-Disposition", "attachment; filename=transactions.pdf");
  res.send(pdf);
});
export const invoicePdf = asyncHandler(async (req, res) => {
  const i = await Invoice.findOne({
    _id: req.params.id,
    businessId: req.user.businessId,
  }).populate("customerId", "name email address companyName");
  if (!i) throw new AppError("Invoice not found", 404, "INVOICE_NOT_FOUND");
  const rows = [
    `Invoice: ${i.invoiceNumber}`,
    `Customer: ${i.customerId?.name || ""}`,
    `Issue: ${i.issueDate?.toISOString?.() || ""}`,
    `Due: ${i.dueDate?.toISOString?.() || ""}`,
    `Subtotal: ${i.subtotal} ${i.currency}`,
    `Tax: ${i.taxAmount}`,
    `Total: ${i.totalAmount}`,
    `Paid: ${i.paidAmount}`,
    `Balance: ${i.balanceDue}`,
    `Status: ${i.status}`,
    ...(i.items || []).map(
      (x) => `${x.description} | ${x.quantity} x ${x.unitPrice} = ${x.amount}`,
    ),
  ];
  const pdf = createPdfBuffer({ title: "Invoice", rows });
  res.set("Content-Type", "application/pdf");
  res.set("Content-Disposition", `inline; filename=${i.invoiceNumber}.pdf`);
  res.send(pdf);
});
export const billPdf = asyncHandler(async (req, res) => {
  const b = await Bill.findOne({
    _id: req.params.id,
    businessId: req.user.businessId,
  }).populate("vendorId", "name email address companyName");
  if (!b) throw new AppError("Bill not found", 404, "BILL_NOT_FOUND");
  const rows = [
    `Bill: ${b.billNumber}`,
    `Vendor: ${b.vendorId?.name || ""}`,
    `Date: ${b.billDate?.toISOString?.() || ""}`,
    `Due: ${b.dueDate?.toISOString?.() || ""}`,
    `Subtotal: ${b.subtotal} ${b.currency}`,
    `Tax: ${b.taxAmount}`,
    `Total: ${b.totalAmount}`,
    `Paid: ${b.paidAmount}`,
    `Balance: ${b.balanceDue}`,
    `Status: ${b.status}`,
    ...(b.items || []).map(
      (x) => `${x.description} | ${x.quantity} x ${x.unitPrice} = ${x.amount}`,
    ),
  ];
  const pdf = createPdfBuffer({ title: "Bill", rows });
  res.set("Content-Type", "application/pdf");
  res.set("Content-Disposition", `inline; filename=${b.billNumber}.pdf`);
  res.send(pdf);
});

export const emailInvoice = asyncHandler(async (req, res) => {
  const i = await Invoice.findOne({
    _id: req.params.id,
    businessId: req.user.businessId,
  }).populate("customerId", "email name");
  if (!i) throw new AppError("Invoice not found", 404, "INVOICE_NOT_FOUND");
  if (!i.customerId?.email)
    throw new AppError("Customer has no email", 400, "CUSTOMER_EMAIL_MISSING");
  const pdf = createPdfBuffer({
    title: `Invoice ${i.invoiceNumber}`,
    rows: [`Total: ${i.totalAmount} ${i.currency}`, `Balance: ${i.balanceDue}`],
  });
  const result = await sendEmail({
    to: i.customerId.email,
    subject: `Invoice ${i.invoiceNumber}`,
    text: `Please find invoice ${i.invoiceNumber}.`,
    html: `<p>Please find invoice <strong>${i.invoiceNumber}</strong>.</p>`,
    attachments: [
      {
        filename: `${i.invoiceNumber}.pdf`,
        content: pdf,
        contentType: "application/pdf",
      },
    ],
  });
  return send(
    res,
    { delivery: result, attachmentReady: true },
    "Invoice email queued",
  );
});
export const emailBill = asyncHandler(async (req, res) => {
  const b = await Bill.findOne({
    _id: req.params.id,
    businessId: req.user.businessId,
  }).populate("vendorId", "email name");
  if (!b) throw new AppError("Bill not found", 404, "BILL_NOT_FOUND");
  if (!b.vendorId?.email)
    throw new AppError("Vendor has no email", 400, "VENDOR_EMAIL_MISSING");
  const pdf = createPdfBuffer({
    title: `Bill ${b.billNumber}`,
    rows: [`Total: ${b.totalAmount} ${b.currency}`, `Balance: ${b.balanceDue}`],
  });
  const result = await sendEmail({
    to: b.vendorId.email,
    subject: `Bill ${b.billNumber}`,
    text: `Bill ${b.billNumber} received.`,
    html: `<p>Bill <strong>${b.billNumber}</strong> is available.</p>`,
    attachments: [
      {
        filename: `${b.billNumber}.pdf`,
        content: pdf,
        contentType: "application/pdf",
      },
    ],
  });
  return send(res, { delivery: result }, "Bill email sent");
});

export const notifications = asyncHandler(async (req, res) => {
  const rows = await Notification.find({
    businessId: req.user.businessId,
    userId: req.user.userId,
  })
    .sort({ createdAt: -1 })
    .limit(100);
  return send(res, { notifications: rows }, "Notifications retrieved");
});
export const markNotificationRead = asyncHandler(async (req, res) => {
  const row = await Notification.findOneAndUpdate(
    {
      _id: req.params.id,
      businessId: req.user.businessId,
      userId: req.user.userId,
    },
    { readAt: new Date() },
    { new: true },
  );
  if (!row)
    throw new AppError("Notification not found", 404, "NOTIFICATION_NOT_FOUND");
  return send(res, { notification: row }, "Notification marked as read");
});

const planLimits = {
  free: { users: 3, documents: 50 },
  starter: { users: 10, documents: 500 },
  pro: { users: 50, documents: 5000 },
  business: { users: 500, documents: 50000 },
};
export const getSubscription = asyncHandler(async (req, res) => {
  let s = await Subscription.findOne({ businessId: req.user.businessId });
  if (!s)
    s = await Subscription.create({
      businessId: req.user.businessId,
      limits: planLimits.free,
    });
  return send(res, { subscription: s }, "Subscription retrieved");
});
export const updateSubscription = asyncHandler(async (req, res) => {
  const plan = req.body.plan;
  if (!plan || !planLimits[plan])
    throw new AppError("Invalid plan", 400, "INVALID_PLAN");
  let s = await Subscription.findOne({ businessId: req.user.businessId });
  if (!s) s = new Subscription({ businessId: req.user.businessId });
  s.plan = plan;
  s.status = "active";
  s.limits = planLimits[plan];
  s.currentPeriodStart = new Date();
  s.currentPeriodEnd = new Date(Date.now() + 30 * 86400000);
  await s.save();
  return send(res, { subscription: s }, "Subscription updated");
});

export const listInventory = asyncHandler(async (req, res) =>
  send(
    res,
    {
      items: await InventoryItem.find({ businessId: req.user.businessId }).sort(
        { name: 1 },
      ),
    },
    "Inventory retrieved",
  ),
);
export const createInventory = asyncHandler(async (req, res) => {
  const b = await Business.findById(req.user.businessId);
  const item = await InventoryItem.create({
    ...req.body,
    businessId: req.user.businessId,
    currency: b.currency,
    createdBy: req.user.userId,
    updatedBy: req.user.userId,
  });
  return send(res, { item }, "Inventory item created", 201);
});
export const adjustInventory = asyncHandler(async (req, res) => {
  const s = await mongoose.startSession();
  try {
    let item;
    await s.withTransaction(async () => {
      item = await InventoryItem.findOne({
        _id: req.params.id,
        businessId: req.user.businessId,
      }).session(s);
      if (!item)
        throw new AppError(
          "Inventory item not found",
          404,
          "INVENTORY_NOT_FOUND",
        );
      const qty = dec(req.body.quantity);
      if (qty.eq(0))
        throw new AppError("Quantity cannot be zero", 400, "INVALID_QUANTITY");
      item.quantity = mongoose.Types.Decimal128.fromString(
        dec(item.quantity).add(qty).toFixed(4),
      );
      item.updatedBy = req.user.userId;
      await item.save({ session: s });
      await InventoryMovement.create(
        [
          {
            businessId: req.user.businessId,
            itemId: item._id,
            type: req.body.type || "adjustment",
            quantity: mongoose.Types.Decimal128.fromString(qty.toFixed(4)),
            unitCost: req.body.unitCost || item.unitCost,
            reference: req.body.reference || null,
            notes: req.body.notes || null,
            createdBy: req.user.userId,
          },
        ],
        { session: s },
      );
    });
    return send(res, { item }, "Inventory adjusted");
  } finally {
    await s.endSession();
  }
});

export const taxReport = asyncHandler(async (req, res) => {
  const q = { businessId: req.user.businessId };
  if (req.query.from || req.query.to)
    q.transactionDate = {
      ...(req.query.from ? { $gte: new Date(req.query.from) } : {}),
      ...(req.query.to ? { $lte: new Date(req.query.to) } : {}),
    };
  const rows = await Transaction.find(q).select(
    "type amount currency transactionDate categoryId",
  );
  let income = new Decimal(0),
    expense = new Decimal(0);
  for (const x of rows)
    x.type === "income"
      ? (income = income.add(x.amount.toString()))
      : x.type === "expense"
        ? (expense = expense.add(x.amount.toString()))
        : null;
  return send(
    res,
    {
      period: { from: req.query.from || null, to: req.query.to || null },
      income: income.toFixed(4),
      expense: expense.toFixed(4),
      net: income.sub(expense).toFixed(4),
      note: "Tax report is a transaction-based summary; jurisdiction-specific filing rules must be configured separately.",
    },
    "Tax report generated",
  );
});

export const createCurrencyRate = asyncHandler(async (req, res) => {
  const row = await CurrencyRate.create({
    ...req.body,
    businessId: req.user.businessId,
    createdBy: req.user.userId,
    effectiveAt: req.body.effectiveAt || new Date(),
  });
  return send(res, { rate: row }, "Currency rate created", 201);
});
export const listCurrencyRates = asyncHandler(async (req, res) =>
  send(
    res,
    {
      rates: await CurrencyRate.find({ businessId: req.user.businessId })
        .sort({ effectiveAt: -1 })
        .limit(200),
    },
    "Currency rates retrieved",
  ),
);
export const convertCurrency = asyncHandler(async (req, res) => {
  const { from, to, amount, at } = req.body;
  const row = await CurrencyRate.findOne({
    businessId: req.user.businessId,
    baseCurrency: from.toUpperCase(),
    quoteCurrency: to.toUpperCase(),
    effectiveAt: { $lte: at ? new Date(at) : new Date() },
  }).sort({ effectiveAt: -1 });
  if (!row)
    throw new AppError(
      "Exchange rate not found",
      404,
      "CURRENCY_RATE_NOT_FOUND",
    );
  return send(
    res,
    {
      from,
      to,
      amount: ds(dec(amount).mul(row.rate.toString())),
      rate: row.rate.toString(),
      effectiveAt: row.effectiveAt,
    },
    "Currency converted",
  );
});

export const aiInsights = asyncHandler(async (req, res) => {
  const tx = await Transaction.find({ businessId: req.user.businessId })
    .sort({ transactionDate: -1 })
    .limit(1000);
  let income = new Decimal(0),
    expense = new Decimal(0);
  for (const x of tx)
    x.type === "income"
      ? (income = income.add(x.amount.toString()))
      : x.type === "expense"
        ? (expense = expense.add(x.amount.toString()))
        : null;
  const ratio = income.eq(0) ? new Decimal(0) : expense.div(income).mul(100);
  return send(
    res,
    {
      summary: `Income ${income.toFixed(2)}; expenses ${expense.toFixed(2)}; expense ratio ${ratio.toFixed(1)}%.`,
      insights: [
        ratio.gt(80)
          ? "Expenses are high relative to income."
          : "Expense ratio is within a manageable range.",
        tx.length > 900
          ? "High recent transaction volume detected."
          : "Transaction volume is within the current sample window.",
      ],
      generatedBy: "deterministic-financial-insights",
    },
    "Financial insights generated",
  );
});
import AuditLog from "../models/AuditLog.js";
export const auditLogs = asyncHandler(async (req, res) => {
  const page = Math.max(1, Number(req.query.page || 1)),
    limit = Math.min(100, Math.max(1, Number(req.query.limit || 50)));
  const filter = { businessId: req.user.businessId };
  if (req.query.action) filter.action = req.query.action;
  const [logs, total] = await Promise.all([
    AuditLog.find(filter)
      .populate("userId", "_id name email")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    AuditLog.countDocuments(filter),
  ]);
  return send(
    res,
    {
      logs,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    },
    "Audit logs retrieved",
  );
});
