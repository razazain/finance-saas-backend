import mongoose from "mongoose";
import Decimal from "decimal.js";

import Bill from "../models/Bill.js";
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

/*
 * Decimal -> MongoDB Decimal128
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
 * Format bill response.
 */
const formatBill =
  (bill) => {
    const object =
      bill.toObject
        ? bill.toObject()
        : bill;

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
        object.items?.map(
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

/*
 * Generate:
 *
 * BILL-000001
 * BILL-000002
 * BILL-000003
 */
const generateBillNumber =
  async ({
    businessId,
    session
  }) => {
    const counter =
      await Counter.findOneAndUpdate(
        {
          businessId,
          key: "bill"
        },
        {
          $inc: {
            sequence: 1
          },

          $setOnInsert: {
            businessId,
            key: "bill"
          }
        },
        {
          new: true,
          upsert: true,
          session
        }
      );

    return `BILL-${String(
      counter.sequence
    ).padStart(6, "0")}`;
  };

/*
 * Calculate bill totals.
 *
 * Frontend never controls:
 *
 * subtotal
 * item amount
 * discount amount
 * tax amount
 * total
 * paid amount
 * balance due
 */
const calculateBill =
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
              "INVALID_BILL_QUANTITY"
            );
          }

          if (
            unitPrice.lte(0)
          ) {
            throw new AppError(
              "Unit price must be greater than 0",
              400,
              "INVALID_BILL_UNIT_PRICE"
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
 * Get vendor belonging to
 * authenticated business.
 */
const getVendor =
  async ({
    businessId,
    vendorId,
    session
  }) => {
    const vendor =
      await Party.findOne({
        _id: vendorId,

        businessId,

        isActive: true,

        type: {
          $in: [
            "vendor",
            "customer_vendor"
          ]
        }
      })
        .session(session);

    if (!vendor) {
      throw new AppError(
        "Vendor not found or inactive",
        404,
        "VENDOR_NOT_FOUND"
      );
    }

    return vendor;
  };

/*
 * Validate all bill categories.
 *
 * Bill categories must be
 * expense categories.
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

        type: "expense"
      })
        .select("_id")
        .session(session);

    if (
      categories.length !==
      categoryIds.length
    ) {
      throw new AppError(
        "One or more bill categories are invalid, inactive, or not expense categories",
        400,
        "INVALID_BILL_CATEGORY"
      );
    }
  };

/*
 * Validate bill dates.
 */
const validateBillDates =
  ({
    billDate,
    dueDate
  }) => {
    const bill =
      new Date(
        billDate
      );

    const due =
      new Date(
        dueDate
      );

    if (
      Number.isNaN(
        bill.getTime()
      ) ||
      Number.isNaN(
        due.getTime()
      )
    ) {
      throw new AppError(
        "Invalid bill dates",
        400,
        "INVALID_BILL_DATES"
      );
    }

    if (
      due < bill
    ) {
      throw new AppError(
        "Due date cannot be before bill date",
        400,
        "INVALID_DUE_DATE"
      );
    }

    return {
      bill,
      due
    };
  };

/*
 * CREATE BILL
 */
export const createBill =
  async ({
    businessId,
    userId,
    vendorId,
    billDate,
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
      let createdBill;

      await session.withTransaction(
        async () => {
          /*
           * 1. Business
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
           * 2. Vendor
           */
          await getVendor({
            businessId,
            vendorId,
            session
          });

          /*
           * 3. Categories
           */
          await validateCategories({
            businessId,
            items,
            session
          });

          /*
           * 4. Dates
           */
          const {
            bill,
            due
          } =
            validateBillDates({
              billDate,
              dueDate
            });

          /*
           * 5. Financial calculations
           */
          const calculated =
            calculateBill({
              items,
              discountRate,
              taxRate
            });

          /*
           * 6. Bill number
           */
          const billNumber =
            await generateBillNumber({
              businessId,
              session
            });

          /*
           * 7. Create bill
           */
          const billDocument =
            new Bill({
              businessId,

              vendorId,

              billNumber,

              billDate:
                bill,

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

          await billDocument.save({
            session
          });

          createdBill =
            billDocument;
        }
      );

      return getBillById({
        businessId,

        billId:
          createdBill._id
      });
    } finally {
      await session.endSession();
    }
  };

/*
 * LIST BILLS
 */
export const getBills =
  async ({
    businessId,
    vendorId,
    status,
    from,
    to,
    page = 1,
    limit = 25
  }) => {
    const filter = {
      businessId
    };

    if (vendorId) {
      filter.vendorId =
        vendorId;
    }

    if (status) {
      filter.status =
        status;
    }

    if (from || to) {
      filter.billDate =
        {};

      if (from) {
        filter.billDate.$gte =
          new Date(from);
      }

      if (to) {
        filter.billDate.$lte =
          new Date(to);
      }
    }

    const skip =
      (page - 1) *
      limit;

    const [
      bills,
      total
    ] =
      await Promise.all([
        Bill.find(filter)
          .populate(
            "vendorId",
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
            billDate: -1,
            createdAt: -1
          })
          .skip(skip)
          .limit(limit),

        Bill.countDocuments(
          filter
        )
      ]);

    return {
      bills:
        bills.map(
          formatBill
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
 * GET SINGLE BILL
 */
export const getBillById =
  async ({
    businessId,
    billId
  }) => {
    const bill =
      await Bill.findOne({
        _id: billId,
        businessId
      })
        .populate(
          "vendorId",
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

    if (!bill) {
      throw new AppError(
        "Bill not found",
        404,
        "BILL_NOT_FOUND"
      );
    }

    return formatBill(
      bill
    );
  };

/*
 * UPDATE DRAFT BILL
 */
export const updateBill =
  async ({
    businessId,
    billId,
    userId,
    vendorId,
    billDate,
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
      let updatedBill;

      await session.withTransaction(
        async () => {
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
           * Only draft bills can
           * be edited.
           */
          if (
            bill.status !==
            "draft"
          ) {
            throw new AppError(
              "Only draft bills can be updated",
              409,
              "BILL_NOT_EDITABLE"
            );
          }

          const finalVendorId =
            vendorId ||
            bill.vendorId;

          const finalBillDate =
            billDate ||
            bill.billDate;

          const finalDueDate =
            dueDate ||
            bill.dueDate;

          const finalItems =
            items ||
            bill.items.map(
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

          const finalDiscountRate =
            discountRate !==
            undefined
              ? discountRate
              : bill.discountRate.toString();

          const finalTaxRate =
            taxRate !==
            undefined
              ? taxRate
              : bill.taxRate.toString();

          /*
           * Validate vendor.
           */
          await getVendor({
            businessId,

            vendorId:
              finalVendorId,

            session
          });

          /*
           * Validate categories.
           */
          await validateCategories({
            businessId,

            items:
              finalItems,

            session
          });

          /*
           * Validate dates.
           */
          const {
            bill: parsedBillDate,
            due
          } =
            validateBillDates({
              billDate:
                finalBillDate,

              dueDate:
                finalDueDate
            });

          /*
           * Recalculate everything.
           */
          const calculated =
            calculateBill({
              items:
                finalItems,

              discountRate:
                finalDiscountRate,

              taxRate:
                finalTaxRate
            });

          /*
           * Update document.
           */
          bill.vendorId =
            finalVendorId;

          bill.billDate =
            parsedBillDate;

          bill.dueDate =
            due;

          bill.items =
            calculated.items;

          bill.subtotal =
            toDecimal128(
              calculated.subtotal
            );

          bill.discountRate =
            toDecimal128(
              calculated.discountRate
            );

          bill.discountAmount =
            toDecimal128(
              calculated.discountAmount
            );

          bill.taxRate =
            toDecimal128(
              calculated.taxRate
            );

          bill.taxAmount =
            toDecimal128(
              calculated.taxAmount
            );

          bill.totalAmount =
            toDecimal128(
              calculated.totalAmount
            );

          /*
           * Draft bills have not received
           * payments yet.
           */
          bill.paidAmount =
            toDecimal128(
              ZERO
            );

          bill.balanceDue =
            toDecimal128(
              calculated.totalAmount
            );

          bill.notes =
            notes !== undefined
              ? notes
              : bill.notes;

          bill.terms =
            terms !== undefined
              ? terms
              : bill.terms;

          bill.updatedBy =
            userId;

          await bill.save({
            session
          });

          updatedBill =
            bill;
        }
      );

      return getBillById({
        businessId,

        billId:
          updatedBill._id
      });
    } finally {
      await session.endSession();
    }
  };

/*
 * UPDATE BILL STATUS
 */
export const updateBillStatus =
  async ({
    businessId,
    billId,
    userId,
    status
  }) => {
    const bill =
      await Bill.findOne({
        _id: billId,
        businessId
      });

    if (!bill) {
      throw new AppError(
        "Bill not found",
        404,
        "BILL_NOT_FOUND"
      );
    }

    /*
     * Already cancelled.
     */
    if (
      bill.status ===
      "cancelled"
    ) {
      throw new AppError(
        "Cancelled bills cannot change status",
        409,
        "BILL_ALREADY_CANCELLED"
      );
    }

    /*
     * Already paid.
     */
    if (
      bill.status ===
      "paid"
    ) {
      throw new AppError(
        "Paid bills cannot change status",
        409,
        "BILL_ALREADY_PAID"
      );
    }

    /*
     * Received.
     */
    if (
      status ===
      "received"
    ) {
      if (
        bill.status !==
        "draft"
      ) {
        throw new AppError(
          "Only draft bills can be marked as received",
          409,
          "INVALID_BILL_STATUS_TRANSITION"
        );
      }

      bill.status =
        "received";
    }

    /*
     * Cancel.
     */
    if (
      status ===
      "cancelled"
    ) {
      if (
        bill.paidAmount.toString() !==
        "0.0000" &&
        bill.paidAmount.toString() !==
        "0"
      ) {
        throw new AppError(
          "A bill with payments cannot be cancelled",
          409,
          "BILL_HAS_PAYMENTS"
        );
      }

      bill.status =
        "cancelled";
    }

    bill.updatedBy =
      userId;

    await bill.save();

    return getBillById({
      businessId,

      billId:
        bill._id
    });
  };