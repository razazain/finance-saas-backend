import mongoose from "mongoose";

const billItemSchema =
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
       * Quantity can be fractional.
       *
       * Examples:
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
       * Unit price is monetary,
       * therefore Decimal128.
       */
      unitPrice: {
        type:
          mongoose.Schema.Types.Decimal128,
        required: true
      },

      /*
       * Calculated by backend:
       *
       * quantity × unitPrice
       */
      amount: {
        type:
          mongoose.Schema.Types.Decimal128,
        required: true
      },

      /*
       * Expense category.
       *
       * This will later be used when
       * creating the expense transaction
       * during bill payment.
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

const billSchema =
  new mongoose.Schema(
    {
      businessId: {
        type:
          mongoose.Schema.Types.ObjectId,
        ref: "Business",
        required: true,
        index: true
      },

      /*
       * Vendor who issued the bill.
       */
      vendorId: {
        type:
          mongoose.Schema.Types.ObjectId,
        ref: "Party",
        required: true,
        index: true
      },

      /*
       * Human-readable bill number.
       *
       * Example:
       *
       * BILL-000001
       */
      billNumber: {
        type: String,
        required: true,
        trim: true
      },

      billDate: {
        type: Date,
        required: true
      },

      dueDate: {
        type: Date,
        required: true
      },

      /*
       * Currency comes from Business.
       *
       * Frontend does not control this.
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
        type: [billItemSchema],
        required: true,

        validate: {
          validator:
            (items) =>
              items.length > 0,

          message:
            "Bill must contain at least one item"
        }
      },

      subtotal: {
        type:
          mongoose.Schema.Types.Decimal128,
        required: true
      },

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
       * Will be updated by Bill Payments.
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
       * received = vendor bill has been received
       * partially_paid / paid will be handled
       * by Bill Payments later.
       */
      status: {
        type: String,
        enum: [
          "draft",
          "received",
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
 * Bill number must be unique
 * inside a business.
 */
billSchema.index(
  {
    businessId: 1,
    billNumber: 1
  },
  {
    unique: true
  }
);

/*
 * Vendor bill history.
 */
billSchema.index({
  businessId: 1,
  vendorId: 1,
  billDate: -1
});

/*
 * Bill listing.
 */
billSchema.index({
  businessId: 1,
  status: 1,
  billDate: -1
});

/*
 * Due-date queries.
 */
billSchema.index({
  businessId: 1,
  dueDate: 1
});

const Bill =
  mongoose.model(
    "Bill",
    billSchema
  );

export default Bill;