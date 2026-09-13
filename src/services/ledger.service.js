import Decimal from "decimal.js";

import Party from "../models/Party.js";
import Invoice from "../models/Invoice.js";
import InvoicePayment from "../models/InvoicePayment.js";
import Bill from "../models/Bill.js";
import BillPayment from "../models/BillPayment.js";

import {
  AppError
} from "../utils/appError.js";

Decimal.set({
  precision: 40,
  rounding: Decimal.ROUND_HALF_UP
});

const ZERO =
  new Decimal("0");

const decimalToString =
  (value) => {
    if (
      value === null ||
      value === undefined
    ) {
      return "0.0000";
    }

    return new Decimal(
      value.toString()
    ).toFixed(4);
  };

/*
 * Convert MongoDB Decimal128
 * to Decimal.js.
 */
const toDecimal =
  (value) => {
    if (
      value === null ||
      value === undefined
    ) {
      return ZERO;
    }

    return new Decimal(
      value.toString()
    );
  };

/*
 * Validate date range.
 */
const validateDateRange =
  ({
    from,
    to
  }) => {
    let fromDate = null;
    let toDate = null;

    if (from) {
      fromDate =
        new Date(from);

      if (
        Number.isNaN(
          fromDate.getTime()
        )
      ) {
        throw new AppError(
          "Invalid from date",
          400,
          "INVALID_FROM_DATE"
        );
      }
    }

    if (to) {
      toDate =
        new Date(to);

      if (
        Number.isNaN(
          toDate.getTime()
        )
      ) {
        throw new AppError(
          "Invalid to date",
          400,
          "INVALID_TO_DATE"
        );
      }
    }

    if (
      fromDate &&
      toDate &&
      fromDate > toDate
    ) {
      throw new AppError(
        "From date cannot be after to date",
        400,
        "INVALID_DATE_RANGE"
      );
    }

    return {
      fromDate,
      toDate
    };
  };

/*
 * Apply date filter to Mongo query.
 */
const applyDateFilter =
  ({
    filter,
    field,
    fromDate,
    toDate
  }) => {
    if (
      !fromDate &&
      !toDate
    ) {
      return;
    }

    filter[field] =
      {};

    if (fromDate) {
      filter[field].$gte =
        fromDate;
    }

    if (toDate) {
      filter[field].$lte =
        toDate;
    }
  };

/*
 * Build customer ledger entries.
 *
 * Customer:
 *
 * Invoice  = debit
 * Payment  = credit
 */
const getCustomerEntries =
  async ({
    businessId,
    partyId,
    fromDate,
    toDate
  }) => {
    const invoiceFilter = {
      businessId,
      customerId: partyId,
      status: {
        $ne: "cancelled"
      }
    };

    applyDateFilter({
      filter:
        invoiceFilter,

      field:
        "issueDate",

      fromDate,

      toDate
    });

    const paymentFilter = {
      businessId,
      customerId: partyId
    };

    applyDateFilter({
      filter:
        paymentFilter,

      field:
        "paymentDate",

      fromDate,

      toDate
    });

    const [
      invoices,
      payments
    ] = await Promise.all([
      Invoice.find(
        invoiceFilter
      )
        .select(
          "_id invoiceNumber issueDate dueDate currency totalAmount paidAmount balanceDue status"
        )
        .lean(),

      InvoicePayment.find(
        paymentFilter
      )
        .select(
          "_id invoiceId amount currency paymentDate reference transactionId"
        )
        .lean()
    ]);

    const entries = [];

    /*
     * Invoice entries.
     */
    for (
      const invoice of invoices
    ) {
      const amount =
        toDecimal(
          invoice.totalAmount
        );

      entries.push({
        id:
          invoice._id,

        type:
          "invoice",

        reference:
          invoice.invoiceNumber,

        date:
          invoice.issueDate,

        dueDate:
          invoice.dueDate,

        description:
          `Invoice ${invoice.invoiceNumber}`,

        debit:
          amount.toFixed(4),

        credit:
          "0.0000",

        amount:
          amount.toFixed(4),

        currency:
          invoice.currency,

        status:
          invoice.status,

        invoiceId:
          invoice._id,

        paymentId:
          null
      });
    }

    /*
     * Payment entries.
     */
    for (
      const payment of payments
    ) {
      const amount =
        toDecimal(
          payment.amount
        );

      entries.push({
        id:
          payment._id,

        type:
          "invoice_payment",

        reference:
          payment.reference,

        date:
          payment.paymentDate,

        dueDate:
          null,

        description:
          payment.reference
            ? `Payment received - ${payment.reference}`
            : "Payment received",

        debit:
          "0.0000",

        credit:
          amount.toFixed(4),

        amount:
          amount.toFixed(4),

        currency:
          payment.currency,

        status:
          "posted",

        invoiceId:
          payment.invoiceId,

        paymentId:
          payment._id,

        transactionId:
          payment.transactionId
      });
    }

    return entries;
  };

/*
 * Build vendor ledger entries.
 *
 * Vendor:
 *
 * Bill    = credit
 * Payment = debit
 */
const getVendorEntries =
  async ({
    businessId,
    partyId,
    fromDate,
    toDate
  }) => {
    const billFilter = {
      businessId,
      vendorId: partyId,
      status: {
        $ne: "cancelled"
      }
    };

    applyDateFilter({
      filter:
        billFilter,

      field:
        "billDate",

      fromDate,

      toDate
    });

    const paymentFilter = {
      businessId,
      vendorId: partyId
    };

    applyDateFilter({
      filter:
        paymentFilter,

      field:
        "paymentDate",

      fromDate,

      toDate
    });

    const [
      bills,
      payments
    ] = await Promise.all([
      Bill.find(
        billFilter
      )
        .select(
          "_id billNumber billDate dueDate currency totalAmount paidAmount balanceDue status"
        )
        .lean(),

      BillPayment.find(
        paymentFilter
      )
        .select(
          "_id billId amount currency paymentDate reference transactionId"
        )
        .lean()
    ]);

    const entries = [];

    /*
     * Bill entries.
     */
    for (
      const bill of bills
    ) {
      const amount =
        toDecimal(
          bill.totalAmount
        );

      entries.push({
        id:
          bill._id,

        type:
          "bill",

        reference:
          bill.billNumber,

        date:
          bill.billDate,

        dueDate:
          bill.dueDate,

        description:
          `Bill ${bill.billNumber}`,

        debit:
          "0.0000",

        credit:
          amount.toFixed(4),

        amount:
          amount.toFixed(4),

        currency:
          bill.currency,

        status:
          bill.status,

        billId:
          bill._id,

        paymentId:
          null
      });
    }

    /*
     * Bill payment entries.
     */
    for (
      const payment of payments
    ) {
      const amount =
        toDecimal(
          payment.amount
        );

      entries.push({
        id:
          payment._id,

        type:
          "bill_payment",

        reference:
          payment.reference,

        date:
          payment.paymentDate,

        dueDate:
          null,

        description:
          payment.reference
            ? `Payment made - ${payment.reference}`
            : "Payment made",

        debit:
          amount.toFixed(4),

        credit:
          "0.0000",

        amount:
          amount.toFixed(4),

        currency:
          payment.currency,

        status:
          "posted",

        billId:
          payment.billId,

        paymentId:
          payment._id,

        transactionId:
          payment.transactionId
      });
    }

    return entries;
  };

/*
 * Sort ledger entries.
 *
 * When two entries have the same
 * date, invoices/bills come before
 * payments created later.
 */
const sortEntries =
  (entries) => {
    return entries.sort(
      (a, b) => {
        const dateA =
          new Date(a.date)
            .getTime();

        const dateB =
          new Date(b.date)
            .getTime();

        if (
          dateA !== dateB
        ) {
          return (
            dateA - dateB
          );
        }

        return String(
          a.id
        ).localeCompare(
          String(b.id)
        );
      }
    );
  };

/*
 * Calculate running balance.
 *
 * Customer:
 *   debit  - credit
 *
 * Vendor:
 *   credit - debit
 */
const addRunningBalance =
  ({
    entries,
    partyType
  }) => {
    let balance =
      ZERO;

    return entries.map(
      (entry) => {
        const debit =
          new Decimal(
            entry.debit
          );

        const credit =
          new Decimal(
            entry.credit
          );

        if (
          partyType ===
          "customer"
        ) {
          balance =
            balance
              .add(debit)
              .sub(credit);
        } else {
          balance =
            balance
              .add(credit)
              .sub(debit);
        }

        return {
          ...entry,

          runningBalance:
            balance.toFixed(4)
        };
      }
    );
  };

/*
 * Calculate customer summary.
 */
const calculateCustomerSummary =
  (entries) => {
    let totalInvoices =
      ZERO;

    let totalPayments =
      ZERO;

    for (
      const entry of entries
    ) {
      if (
        entry.type ===
        "invoice"
      ) {
        totalInvoices =
          totalInvoices.add(
            entry.amount
          );
      }

      if (
        entry.type ===
        "invoice_payment"
      ) {
        totalPayments =
          totalPayments.add(
            entry.amount
          );
      }
    }

    const balance =
      totalInvoices.sub(
        totalPayments
      );

    return {
      totalInvoices:
        totalInvoices.toFixed(4),

      totalPayments:
        totalPayments.toFixed(4),

      balanceDue:
        balance.toFixed(4)
    };
  };

/*
 * Calculate vendor summary.
 */
const calculateVendorSummary =
  (entries) => {
    let totalBills =
      ZERO;

    let totalPayments =
      ZERO;

    for (
      const entry of entries
    ) {
      if (
        entry.type ===
        "bill"
      ) {
        totalBills =
          totalBills.add(
            entry.amount
          );
      }

      if (
        entry.type ===
        "bill_payment"
      ) {
        totalPayments =
          totalPayments.add(
            entry.amount
          );
      }
    }

    const balance =
      totalBills.sub(
        totalPayments
      );

    return {
      totalBills:
        totalBills.toFixed(4),

      totalPayments:
        totalPayments.toFixed(4),

      balanceDue:
        balance.toFixed(4)
    };
  };

/*
 * GET PARTY LEDGER
 */
export const getPartyLedger =
  async ({
    businessId,
    partyId,
    from,
    to,
    page = 1,
    limit = 50
  }) => {
    /*
     * 1. Find party inside
     * authenticated business.
     */
    const party =
      await Party.findOne({
        _id:
          partyId,

        businessId
      })
        .select(
          "_id name type email phone companyName isActive"
        )
        .lean();

    if (!party) {
      throw new AppError(
        "Party not found",
        404,
        "PARTY_NOT_FOUND"
      );
    }

    /*
     * 2. Validate dates.
     */
    const {
      fromDate,
      toDate
    } =
      validateDateRange({
        from,
        to
      });

    /*
     * 3. Determine which ledger
     * sides are required.
     */
    const isCustomer =
      [
        "customer",
        "customer_vendor"
      ].includes(
        party.type
      );

    const isVendor =
      [
        "vendor",
        "customer_vendor"
      ].includes(
        party.type
      );

    let customerEntries =
      [];

    let vendorEntries =
      [];

    if (isCustomer) {
      customerEntries =
        await getCustomerEntries({
          businessId,

          partyId,

          fromDate,

          toDate
        });
    }

    if (isVendor) {
      vendorEntries =
        await getVendorEntries({
          businessId,

          partyId,

          fromDate,

          toDate
        });
    }

    /*
     * 4. Combine both sides.
     *
     * For customer_vendor, entries
     * are explicitly labelled by type.
     */
    const allEntries =
      sortEntries([
        ...customerEntries,
        ...vendorEntries
      ]);

    /*
     * 5. Calculate summaries before
     * pagination.
     */
    const customerSummary =
      calculateCustomerSummary(
        customerEntries
      );

    const vendorSummary =
      calculateVendorSummary(
        vendorEntries
      );

    /*
     * 6. Running balance.
     *
     * For customer_vendor, a single
     * combined balance would be
     * confusing because receivable
     * and payable are different things.
     *
     * Therefore we keep the entries
     * labelled and expose separate
     * summaries.
     */
    let entriesWithBalance;

    if (
      party.type ===
      "customer"
    ) {
      entriesWithBalance =
        addRunningBalance({
          entries:
            allEntries,

          partyType:
            "customer"
        });
    } else if (
      party.type ===
      "vendor"
    ) {
      entriesWithBalance =
        addRunningBalance({
          entries:
            allEntries,

          partyType:
            "vendor"
        });
    } else {
      /*
       * customer_vendor:
       *
       * Calculate running balance
       * separately for each side.
       */
      let customerBalance =
        ZERO;

      let vendorBalance =
        ZERO;

      entriesWithBalance =
        allEntries.map(
          (entry) => {
            const amount =
              new Decimal(
                entry.amount
              );

            if (
              entry.type ===
              "invoice"
            ) {
              customerBalance =
                customerBalance.add(
                  amount
                );
            }

            if (
              entry.type ===
              "invoice_payment"
            ) {
              customerBalance =
                customerBalance.sub(
                  amount
                );
            }

            if (
              entry.type ===
              "bill"
            ) {
              vendorBalance =
                vendorBalance.add(
                  amount
                );
            }

            if (
              entry.type ===
              "bill_payment"
            ) {
              vendorBalance =
                vendorBalance.sub(
                  amount
                );
            }

            return {
              ...entry,

              runningBalance:
                entry.type ===
                  "invoice" ||
                entry.type ===
                  "invoice_payment"
                  ? customerBalance.toFixed(
                      4
                    )
                  : vendorBalance.toFixed(
                      4
                    )
            };
          }
        );
    }

    /*
     * 7. Pagination.
     */
    const total =
      entriesWithBalance.length;

    const skip =
      (page - 1) *
      limit;

    const paginatedEntries =
      entriesWithBalance.slice(
        skip,
        skip + limit
      );

    /*
     * 8. Return complete ledger.
     */
    return {
      party,

      summary: {
        customer:
          isCustomer
            ? customerSummary
            : null,

        vendor:
          isVendor
            ? vendorSummary
            : null
      },

      entries:
        paginatedEntries,

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