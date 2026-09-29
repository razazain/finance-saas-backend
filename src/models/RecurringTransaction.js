import mongoose from "mongoose";

const recurringTransactionSchema = new mongoose.Schema(
  {
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      required: true,
      index: true,
    },

    /*
     * income / expense / transfer
     */
    type: {
      type: String,
      enum: ["income", "expense", "transfer"],
      required: true,
    },

    /*
     * Positive financial amount.
     */
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

    /*
     * Source account.
     *
     * For income:
     * money enters this account.
     *
     * For expense:
     * money leaves this account.
     *
     * For transfer:
     * money leaves this account.
     */
    accountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      required: true,
    },

    /*
     * Required for income/expense.
     */
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      default: null,
    },

    /*
     * Required for transfers.
     */
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

    /*
     * How often the transaction
     * should be generated.
     *
     * Supported:
     *
     * daily
     * weekly
     * monthly
     * yearly
     * custom
     */
    frequency: {
      type: String,
      enum: ["daily", "weekly", "monthly", "yearly", "custom"],
      required: true,
    },

    /*
     * Only required when frequency
     * is custom.
     *
     * Example:
     *
     * 6
     * 10
     * 45
     * 90
     */
    intervalDays: {
      type: Number,
      min: 1,
      max: 3650,
      default: null,
    },

    /*
     * First date from which this
     * recurring rule can execute.
     */
    startDate: {
      type: Date,
      required: true,
      index: true,
    },

    /*
     * Optional end date.
     */
    endDate: {
      type: Date,
      default: null,
    },

    /*
     * Next date on which the system
     * should generate a transaction.
     */
    nextRunAt: {
      type: Date,
      required: true,
      index: true,
    },

    /*
     * Number of transactions generated
     * by this recurring rule.
     */
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

    /*
     * Most recent generated transaction.
     */
    lastTransactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Transaction",
      default: null,
    },

    /*
     * Active recurring rules can execute.
     */
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

/*
 * Find recurring rules that are due.
 */
recurringTransactionSchema.index({
  businessId: 1,
  isActive: 1,
  nextRunAt: 1,
});

/*
 * Useful for listing rules by type.
 */
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
