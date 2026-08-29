import mongoose from "mongoose";

const invoiceItemSchema =
  new mongoose.Schema(
    {
      description: {
        type: String,
        required: true,
        trim: true,
        minlength: 1,
        maxlength: 500
      },

      /*
       * Quantity is stored as Decimal128
       * because quantities can sometimes
       * be fractional.
       *
       * Example:
       * 1
       * 2.5
       * 10
       */
      quantity: {
        type:
          mongoose.Schema.Types.Decimal128,
        required: true
      },

      /*
       * Unit price is always monetary
       * and therefore Decimal128.
       */
      unitPrice: {
        type:
          mongoose.Schema.Types.Decimal128,
        required: true
      },

      /*
       * Calculated by the backend:
       *
       * quantity × unitPrice
       */
      amount: {
        type:
          mongoose.Schema.Types.Decimal128,
        required: true
      },

      /*
       * Optional income category.
       *
       * This is useful later when an
       * invoice payment creates an
       * income transaction.
       */
      categoryId: {
        type:
          mongoose.Schema.Types.ObjectId,
        ref: "Category",
        default: null
      }
    },
    {
      _id: true
    }
  );

const invoiceSchema =
  new mongoose.Schema(
    {
      businessId: {
        type:
          mongoose.Schema.Types.ObjectId,
        ref: "Business",
        required: true,
        index: true
      },

      customerId: {
        type:
          mongoose.Schema.Types.ObjectId,
        ref: "Party",
        required: true,
        index: true
      },

      /*
       * Human-readable invoice number.
       *
       * Example:
       *
       * INV-000001
       */
      invoiceNumber: {
        type: String,
        required: true,
        trim: true
      },

      issueDate: {
        type: Date,
        required: true
      },

      dueDate: {
        type: Date,
        required: true
      },

      /*
       * Currency comes from the business.
       *
       * It is never accepted from the
       * frontend.
       */
      currency: {
        type: String,
        required: true,
        uppercase: true,
        trim: true,
        minlength: 3,
        maxlength: 3
      },

      items: {
        type: [invoiceItemSchema],
        required: true,
        validate: {
          validator:
            (items) =>
              items.length > 0,

          message:
            "Invoice must contain at least one item"
        }
      },

      subtotal: {
        type:
          mongoose.Schema.Types.Decimal128,
        required: true
      },

      /*
       * Percentage supplied by user.
       *
       * Example:
       * 5 = 5%
       */
      discountRate: {
        type:
          mongoose.Schema.Types.Decimal128,
        required: true,
        default: 0
      },

      discountAmount: {
        type:
          mongoose.Schema.Types.Decimal128,
        required: true,
        default: 0
      },

      taxRate: {
        type:
          mongoose.Schema.Types.Decimal128,
        required: true,
        default: 0
      },

      taxAmount: {
        type:
          mongoose.Schema.Types.Decimal128,
        required: true,
        default: 0
      },

      totalAmount: {
        type:
          mongoose.Schema.Types.Decimal128,
        required: true
      },

      /*
       * Payment functionality will be
       * implemented later.
       */
      paidAmount: {
        type:
          mongoose.Schema.Types.Decimal128,
        required: true,
        default: 0
      },

      balanceDue: {
        type:
          mongoose.Schema.Types.Decimal128,
        required: true
      },

      /*
       * Payment-related statuses will
       * be changed by the payment module.
       */
      status: {
        type: String,
        enum: [
          "draft",
          "sent",
          "partially_paid",
          "paid",
          "cancelled"
        ],
        default: "draft",
        index: true
      },

      notes: {
        type: String,
        trim: true,
        maxlength: 2000,
        default: null
      },

      terms: {
        type: String,
        trim: true,
        maxlength: 2000,
        default: null
      },

      createdBy: {
        type:
          mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
      },

      updatedBy: {
        type:
          mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
      }
    },
    {
      timestamps: true
    }
  );

/*
 * Invoice number is unique inside
 * a business.
 */
invoiceSchema.index(
  {
    businessId: 1,
    invoiceNumber: 1
  },
  {
    unique: true
  }
);

/*
 * Useful for customer invoice history.
 */
invoiceSchema.index({
  businessId: 1,
  customerId: 1,
  issueDate: -1
});

/*
 * Useful for invoice listing.
 */
invoiceSchema.index({
  businessId: 1,
  status: 1,
  issueDate: -1
});

/*
 * Useful for due-date queries.
 */
invoiceSchema.index({
  businessId: 1,
  dueDate: 1
});

const Invoice =
  mongoose.model(
    "Invoice",
    invoiceSchema
  );

export default Invoice;