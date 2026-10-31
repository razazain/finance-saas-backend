import mongoose from "mongoose";

const billItemSchema = new mongoose.Schema(
  {
    description: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 500,
    },

    quantity: {
      type: mongoose.Schema.Types.Decimal128,
      required: true,
    },

    unitPrice: {
      type: mongoose.Schema.Types.Decimal128,
      required: true,
    },

    amount: {
      type: mongoose.Schema.Types.Decimal128,
      required: true,
    },

    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      default: null,
    },
  },
  {
    _id: true,
  },
);

const billSchema = new mongoose.Schema(
  {
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      required: true,
      index: true,
    },

    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Party",
      required: true,
      index: true,
    },

    billNumber: {
      type: String,
      required: true,
      trim: true,
    },

    billDate: {
      type: Date,
      required: true,
    },

    dueDate: {
      type: Date,
      required: true,
    },

    currency: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      minlength: 3,
      maxlength: 3,
    },

    items: {
      type: [billItemSchema],
      required: true,

      validate: {
        validator: (items) => items.length > 0,

        message: "Bill must contain at least one item",
      },
    },

    subtotal: {
      type: mongoose.Schema.Types.Decimal128,
      required: true,
    },

    discountRate: {
      type: mongoose.Schema.Types.Decimal128,
      required: true,
      default: 0,
    },

    discountAmount: {
      type: mongoose.Schema.Types.Decimal128,
      required: true,
      default: 0,
    },

    taxRate: {
      type: mongoose.Schema.Types.Decimal128,
      required: true,
      default: 0,
    },

    taxAmount: {
      type: mongoose.Schema.Types.Decimal128,
      required: true,
      default: 0,
    },

    totalAmount: {
      type: mongoose.Schema.Types.Decimal128,
      required: true,
    },

    paidAmount: {
      type: mongoose.Schema.Types.Decimal128,
      required: true,
      default: 0,
    },

    balanceDue: {
      type: mongoose.Schema.Types.Decimal128,
      required: true,
    },

    status: {
      type: String,
      enum: ["draft", "received", "partially_paid", "paid", "cancelled"],
      default: "draft",
      index: true,
    },

    notes: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: null,
    },

    terms: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: null,
    },

    sourceDocumentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Document",
      default: null,
      index: true,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

billSchema.index(
  {
    businessId: 1,
    billNumber: 1,
  },
  {
    unique: true,
  },
);

billSchema.index({
  businessId: 1,
  vendorId: 1,
  billDate: -1,
});

billSchema.index({
  businessId: 1,
  status: 1,
  billDate: -1,
});

billSchema.index({
  businessId: 1,
  dueDate: 1,
});

const Bill = mongoose.model("Bill", billSchema);

export default Bill;
