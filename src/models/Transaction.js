import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema(
  {
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      required: true,
      index: true,
    },
  
    type: {
      type: String,
      enum: ["income", "expense", "transfer"],
      required: true,
    },

 
    amount: {
      type: mongoose.Schema.Types.Decimal128,
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

    accountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      required: true,
    },

    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      default: null,
    },

    destinationAccountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      default: null,
    },

    transactionDate: {
      type: Date,
      required: true,
    },

    description: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: null,
    },

    reference: {
      type: String,
      trim: true,
      maxlength: 100,
      default: null,
    },

    recurringExecutionKey: {
      type: String,
      default: null,
      unique: true,
      sparse: true,
      index: true,
    },

    source: {
      type: String,
      enum: ["manual", "ai", "import", "recurring"],
      default: "manual",
    },

    status: {
      type: String,
      enum: ["posted", "voided"],
      default: "posted",
    },

    voidedAt: {
      type: Date,
      default: null,
    },

    voidedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    voidReason: {
      type: String,
      trim: true,
      maxlength: 500,
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

transactionSchema.index({
  businessId: 1,
  transactionDate: -1,
});

transactionSchema.index({
  businessId: 1,
  type: 1,
  transactionDate: -1,
});

transactionSchema.index({
  businessId: 1,
  accountId: 1,
  transactionDate: -1,
});

transactionSchema.index({
  businessId: 1,
  categoryId: 1,
  transactionDate: -1,
});

transactionSchema.index({
  businessId: 1,
  status: 1,
  transactionDate: -1,
});

const Transaction = mongoose.model("Transaction", transactionSchema);

export default Transaction;
