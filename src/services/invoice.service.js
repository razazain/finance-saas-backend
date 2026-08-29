import mongoose from "mongoose";
import Decimal from "decimal.js";

import Invoice from "../models/Invoice.js";
import Counter from "../models/Counter.js";
import Party from "../models/Party.js";
import Category from "../models/Category.js";
import Business from "../models/Bussiness.js";

import {
  AppError
} from "../utils/appError.js";

Decimal.set({
  precision: 40,
  rounding: Decimal.ROUND_HALF_UP
});

const ZERO =
  new Decimal("0");

const toDecimal128 =
  (value) => {
    return mongoose.Types.Decimal128.fromString(
      new Decimal(value)
        .toFixed(4)
    );
  };

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
 * Generate:
 *
 * INV-000001
 * INV-000002
 * INV-000003
 *
 * Counter is business-scoped.
 */
const generateInvoiceNumber =
  async ({
    businessId,
    session
  }) => {
    const counter =
      await Counter.findOneAndUpdate(
        {
          businessId,
          key: "invoice"
        },
        {
          $inc: {
            sequence: 1
          },

          $setOnInsert: {
            businessId,
            key: "invoice"
          }
        },
        {
          new: true,
          upsert: true,
          session
        }
      );

    return `INV-${String(
      counter.sequence
    ).padStart(6, "0")}`;
  };

/*
 * Validate and calculate invoice
 * financial values.
 *
 * The frontend never supplies:
 *
 * subtotal
 * item amount
 * discount amount
 * tax amount
 * total amount
 * paid amount
 * balance due
 */
const calculateInvoice =
  ({
    items,
    discountRate = "0",
    taxRate = "0"
  }) => {
    let subtotal =
      ZERO;

    const calculatedItems =
      items.map(
        (item) => {
          const quantity =
            new Decimal(
              item.quantity
            );

          const unitPrice =
            new Decimal(
              item.unitPrice
            );

          if (
            quantity.lte(0)
          ) {
            throw new AppError(
              "Quantity must be greater than 0",
              400,
              "INVALID_INVOICE_QUANTITY"
            );
          }

          if (
            unitPrice.lte(0)
          ) {
            throw new AppError(
              "Unit price must be greater than 0",
              400,
              "INVALID_INVOICE_UNIT_PRICE"
            );
          }

          const amount =
            quantity.mul(
              unitPrice
            );

          subtotal =
            subtotal.add(
              amount
            );

          return {
            description:
              item.description,

            quantity:
              toDecimal128(
                quantity
              ),

            unitPrice:
              toDecimal128(
                unitPrice
              ),

            amount:
              toDecimal128(
                amount
              ),

            categoryId:
              item.categoryId ||
              null
          };
        }
      );

    const discount =
      new Decimal(
        discountRate
      );

    const tax =
      new Decimal(
        taxRate
      );

    if (
      discount.lt(0) ||
      discount.gt(100)
    ) {
      throw new AppError(
        "Discount rate must be between 0 and 100",
        400,
        "INVALID_DISCOUNT_RATE"
      );
    }

    if (
      tax.lt(0) ||
      tax.gt(100)
    ) {
      throw new AppError(
        "Tax rate must be between 0 and 100",
        400,
        "INVALID_TAX_RATE"
      );
    }

    const discountAmount =
      subtotal
        .mul(discount)
        .div(100);

    const taxableAmount =
      subtotal.sub(
        discountAmount
      );

    const taxAmount =
      taxableAmount
        .mul(tax)
        .div(100);

    const totalAmount =
      taxableAmount.add(
        taxAmount
      );

    return {
      items:
        calculatedItems,

      subtotal,

      discountRate:
        discount,

      discountAmount,

      taxRate:
        tax,

      taxAmount,

      totalAmount,

      paidAmount:
        ZERO,

      balanceDue:
        totalAmount
    };
  };

/*
 * Validate that customer belongs
 * to the authenticated business.
 */
const getCustomer =
  async ({
    businessId,
    customerId,
    session
  }) => {
    const customer =
      await Party.findOne({
        _id: customerId,
        businessId,
        isActive: true,

        type: {
          $in: [
            "customer",
            "customer_vendor"
          ]
        }
      }).session(session);

    if (!customer) {
      throw new AppError(
        "Customer not found or inactive",
        404,
        "CUSTOMER_NOT_FOUND"
      );
    }

    return customer;
  };

/*
 * Validate optional category IDs.
 */
const validateCategories =
  async ({
    businessId,
    items,
    session
  }) => {
    const categoryIds =
      [
        ...new Set(
          items
            .map(
              (item) =>
                item.categoryId
            )
            .filter(Boolean)
        )
      ];

    if (
      categoryIds.length === 0
    ) {
      return;
    }

    const categories =
      await Category.find({
        _id: {
          $in: categoryIds
        },

        businessId,

        isActive: true,

        type: "income"
      })
        .select(
          "_id"
        )
        .session(session);

    if (
      categories.length !==
      categoryIds.length
    ) {
      throw new AppError(
        "One or more invoice categories are invalid, inactive, or not income categories",
        400,
        "INVALID_INVOICE_CATEGORY"
      );
    }
  };

/*
 * Validate dates.
 */
const validateInvoiceDates =
  ({
    issueDate,
    dueDate
  }) => {
    const issue =
      new Date(
        issueDate
      );

    const due =
      new Date(
        dueDate
      );

    if (
      Number.isNaN(
        issue.getTime()
      ) ||
      Number.isNaN(
        due.getTime()
      )
    ) {
      throw new AppError(
        "Invalid invoice dates",
        400,
        "INVALID_INVOICE_DATES"
      );
    }

    if (
      due < issue
    ) {
      throw new AppError(
        "Due date cannot be before issue date",
        400,
        "INVALID_DUE_DATE"
      );
    }

    return {
      issue,
      due
    };
  };

/*
 * CREATE INVOICE
 */
export const createInvoice =
  async ({
    businessId,
    userId,
    customerId,
    issueDate,
    dueDate,
    items,
    discountRate = "0",
    taxRate = "0",
    notes,
    terms
  }) => {
    const session =
      await mongoose.startSession();

    try {
      let createdInvoice;

      await session.withTransaction(
        async () => {
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

          await getCustomer({
            businessId,
            customerId,
            session
          });

          await validateCategories({
            businessId,
            items,
            session
          });

          const {
            issue,
            due
          } =
            validateInvoiceDates({
              issueDate,
              dueDate
            });

          const calculated =
            calculateInvoice({
              items,
              discountRate,
              taxRate
            });

          const invoiceNumber =
            await generateInvoiceNumber({
              businessId,
              session
            });

          const invoice =
            new Invoice({
              businessId,

              customerId,

              invoiceNumber,

              issueDate:
                issue,

              dueDate:
                due,

              currency:
                business.currency,

              items:
                calculated.items,

              subtotal:
                toDecimal128(
                  calculated.subtotal
                ),

              discountRate:
                toDecimal128(
                  calculated.discountRate
                ),

              discountAmount:
                toDecimal128(
                  calculated.discountAmount
                ),

              taxRate:
                toDecimal128(
                  calculated.taxRate
                ),

              taxAmount:
                toDecimal128(
                  calculated.taxAmount
                ),

              totalAmount:
                toDecimal128(
                  calculated.totalAmount
                ),

              paidAmount:
                toDecimal128(
                  calculated.paidAmount
                ),

              balanceDue:
                toDecimal128(
                  calculated.balanceDue
                ),

              status:
                "draft",

              notes:
                notes || null,

              terms:
                terms || null,

              createdBy:
                userId,

              updatedBy:
                userId
            });

          await invoice.save({
            session
          });

          createdInvoice =
            invoice;
        }
      );

      return getInvoiceById({
        businessId,
        invoiceId:
          createdInvoice._id
      });
    } finally {
      await session.endSession();
    }
  };

/*
 * LIST INVOICES
 */
export const getInvoices =
  async ({
    businessId,
    customerId,
    status,
    from,
    to,
    page = 1,
    limit = 25
  }) => {
    const filter = {
      businessId
    };

    if (customerId) {
      filter.customerId =
        customerId;
    }

    if (status) {
      filter.status =
        status;
    }

    if (from || to) {
      filter.issueDate =
        {};

      if (from) {
        filter.issueDate.$gte =
          new Date(from);
      }

      if (to) {
        filter.issueDate.$lte =
          new Date(to);
      }
    }

    const skip =
      (page - 1) *
      limit;

    const [
      invoices,
      total
    ] =
      await Promise.all([
        Invoice.find(filter)
          .populate(
            "customerId",
            "_id name type email phone companyName"
          )
          .populate(
            "createdBy",
            "_id name email"
          )
          .populate(
            "updatedBy",
            "_id name email"
          )
          .sort({
            issueDate: -1,
            createdAt: -1
          })
          .skip(skip)
          .limit(limit),

        Invoice.countDocuments(
          filter
        )
      ]);

    return {
      invoices:
        invoices.map(
          formatInvoice
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
 * GET SINGLE INVOICE
 */
export const getInvoiceById =
  async ({
    businessId,
    invoiceId
  }) => {
    const invoice =
      await Invoice.findOne({
        _id: invoiceId,
        businessId
      })
        .populate(
          "customerId",
          "_id name type email phone companyName address taxNumber"
        )
        .populate(
          "items.categoryId",
          "_id name type"
        )
        .populate(
          "createdBy",
          "_id name email"
        )
        .populate(
          "updatedBy",
          "_id name email"
        );

    if (!invoice) {
      throw new AppError(
        "Invoice not found",
        404,
        "INVOICE_NOT_FOUND"
      );
    }

    return formatInvoice(
      invoice
    );
  };

/*
 * UPDATE DRAFT INVOICE
 */
export const updateInvoice =
  async ({
    businessId,
    invoiceId,
    userId,
    customerId,
    issueDate,
    dueDate,
    items,
    discountRate,
    taxRate,
    notes,
    terms
  }) => {
    const session =
      await mongoose.startSession();

    try {
      let updatedInvoice;

      await session.withTransaction(
        async () => {
          const invoice =
            await Invoice.findOne({
              _id: invoiceId,
              businessId
            }).session(session);

          if (!invoice) {
            throw new AppError(
              "Invoice not found",
              404,
              "INVOICE_NOT_FOUND"
            );
          }

          if (
            invoice.status !==
            "draft"
          ) {
            throw new AppError(
              "Only draft invoices can be edited",
              409,
              "INVOICE_NOT_EDITABLE"
            );
          }

          const nextCustomerId =
            customerId ||
            invoice.customerId;

          await getCustomer({
            businessId,
            customerId:
              nextCustomerId,
            session
          });

          const nextItems =
            items ||
            invoice.items.map(
              (item) => ({
                description:
                  item.description,

                quantity:
                  item.quantity.toString(),

                unitPrice:
                  item.unitPrice.toString(),

                categoryId:
                  item.categoryId
                    ? item.categoryId.toString()
                    : undefined
              })
            );

          await validateCategories({
            businessId,
            items:
              nextItems,
            session
          });

          const nextIssueDate =
            issueDate ||
            invoice.issueDate;

          const nextDueDate =
            dueDate ||
            invoice.dueDate;

          const {
            issue,
            due
          } =
            validateInvoiceDates({
              issueDate:
                nextIssueDate,

              dueDate:
                nextDueDate
            });

          const calculated =
            calculateInvoice({
              items:
                nextItems,

              discountRate:
                discountRate !==
                undefined
                  ? discountRate
                  : invoice.discountRate.toString(),

              taxRate:
                taxRate !==
                undefined
                  ? taxRate
                  : invoice.taxRate.toString()
            });

          /*
           * Draft invoices cannot have
           * payments yet.
           */
          invoice.customerId =
            nextCustomerId;

          invoice.issueDate =
            issue;

          invoice.dueDate =
            due;

          invoice.items =
            calculated.items;

          invoice.subtotal =
            toDecimal128(
              calculated.subtotal
            );

          invoice.discountRate =
            toDecimal128(
              calculated.discountRate
            );

          invoice.discountAmount =
            toDecimal128(
              calculated.discountAmount
            );

          invoice.taxRate =
            toDecimal128(
              calculated.taxRate
            );

          invoice.taxAmount =
            toDecimal128(
              calculated.taxAmount
            );

          invoice.totalAmount =
            toDecimal128(
              calculated.totalAmount
            );

          invoice.paidAmount =
            toDecimal128(
              ZERO
            );

          invoice.balanceDue =
            toDecimal128(
              calculated.totalAmount
            );

          if (
            notes !== undefined
          ) {
            invoice.notes =
              notes;
          }

          if (
            terms !== undefined
          ) {
            invoice.terms =
              terms;
          }

          invoice.updatedBy =
            userId;

          await invoice.save({
            session
          });

          updatedInvoice =
            invoice;
        }
      );

      return getInvoiceById({
        businessId,
        invoiceId:
          updatedInvoice._id
      });
    } finally {
      await session.endSession();
    }
  };

/*
 * STATUS UPDATE
 */
export const updateInvoiceStatus =
  async ({
    businessId,
    invoiceId,
    userId,
    status
  }) => {
    const invoice =
      await Invoice.findOne({
        _id: invoiceId,
        businessId
      });

    if (!invoice) {
      throw new AppError(
        "Invoice not found",
        404,
        "INVOICE_NOT_FOUND"
      );
    }

    if (
      status ===
      "sent"
    ) {
      if (
        invoice.status !==
        "draft"
      ) {
        throw new AppError(
          "Only draft invoices can be marked as sent",
          409,
          "INVALID_INVOICE_STATUS_TRANSITION"
        );
      }
    }

    if (
      status ===
      "cancelled"
    ) {
      if (
        invoice.status ===
        "cancelled"
      ) {
        throw new AppError(
          "Invoice is already cancelled",
          409,
          "INVOICE_ALREADY_CANCELLED"
        );
      }

      if (
        invoice.status ===
        "paid" ||
        invoice.status ===
        "partially_paid"
      ) {
        throw new AppError(
          "Paid invoices cannot be cancelled",
          409,
          "PAID_INVOICE_CANNOT_BE_CANCELLED"
        );
      }
    }

    invoice.status =
      status;

    invoice.updatedBy =
      userId;

    await invoice.save();

    return formatInvoice(
      invoice
    );
  };

/*
 * Convert Decimal128 fields
 * to API-safe strings.
 */
const formatInvoice =
  (invoice) => {
    const object =
      invoice.toObject
        ? invoice.toObject()
        : invoice;

    return {
      ...object,

      subtotal:
        decimalToString(
          object.subtotal
        ),

      discountRate:
        decimalToString(
          object.discountRate
        ),

      discountAmount:
        decimalToString(
          object.discountAmount
        ),

      taxRate:
        decimalToString(
          object.taxRate
        ),

      taxAmount:
        decimalToString(
          object.taxAmount
        ),

      totalAmount:
        decimalToString(
          object.totalAmount
        ),

      paidAmount:
        decimalToString(
          object.paidAmount
        ),

      balanceDue:
        decimalToString(
          object.balanceDue
        ),

      items:
        object.items.map(
          (item) => ({
            ...item,

            quantity:
              decimalToString(
                item.quantity
              ),

            unitPrice:
              decimalToString(
                item.unitPrice
              ),

            amount:
              decimalToString(
                item.amount
              )
          })
        )
    };
  };