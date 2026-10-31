import mongoose from "mongoose";

const recurringTransactionSchema = new mongoose.Schema(
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

    frequency: {
      type: String,
      enum: ["daily", "weekly", "monthly", "yearly", "custom"],
      required: true,
    },

    intervalDays: {
      type: Number,
      min: 1,
      max: 3650,
      default: null,
    },

    startDate: {
      type: Date,
      required: true,
      index: true,
    },

    endDate: {
      type: Date,
      default: null,
    },

    nextRunAt: {
      type: Date,
      required: true,
      index: true,
    },

    executionCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    lastExecutionAt: {
      type: Date,
      default: null,
    },

    lastExecutionError: {
      type: String,
      maxlength: 1000,
      default: null,
    },

    lastTransactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Transaction",
      default: null,
    },

    isActive: {
      type: Boolean,
      default: true,
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

recurringTransactionSchema.index({
  businessId: 1,
  isActive: 1,
  nextRunAt: 1,
});

recurringTransactionSchema.index({
  businessId: 1,
  type: 1,
  isActive: 1,
});

const RecurringTransaction = mongoose.model(
  "RecurringTransaction",
  recurringTransactionSchema,
);

export default RecurringTransaction;
