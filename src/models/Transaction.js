import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema(
  {
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      required: true,
      index: true,
    },

    /*
     * income:
     * Money entering an account.
     *
     * expense:
     * Money leaving an account.
     *
     * transfer:
     * Money moving between two
     * accounts owned by the same business.
     */
    type: {
      type: String,
      enum: ["income", "expense", "transfer"],
      required: true,
    },

    /*
     * Positive amount only.
     *
     * Direction is determined by
     * transaction type.
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
     * Main account affected by
     * income/expense.
     *
     * For transfer transactions this
     * represents the source account.
     */
    accountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      required: true,
    },

    /*
     * Required for income/expense.
     *
     * Must be null for transfer.
     */
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      default: null,
    },

    /*
     * Only used for transfers.
     *
     * accountId = source
     * destinationAccountId = destination
     */
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

    /*
     * manual:
     * Created directly by user.
     *
     * ai:
     * Will be used later when AI
     * creates a transaction draft.
     *
     * import:
     * Reserved for future imports.
     */
    source: {
      type: String,
      enum: ["manual", "ai", "import", "recurring"],
      default: "manual",
    },

    /*
     * Transactions are posted when
     * created.
     *
     * They are never physically
     * deleted.
     */
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
 * Useful for dashboard/report queries.
 */
transactionSchema.index({
  businessId: 1,
  transactionDate: -1,
});

/*
 * Useful when filtering by type.
 */
transactionSchema.index({
  businessId: 1,
  type: 1,
  transactionDate: -1,
});

/*
 * Useful for account ledger.
 */
transactionSchema.index({
  businessId: 1,
  accountId: 1,
  transactionDate: -1,
});

/*
 * Useful for category reports.
 */
transactionSchema.index({
  businessId: 1,
  categoryId: 1,
  transactionDate: -1,
});

/*
 * Useful for status filtering.
 */
transactionSchema.index({
  businessId: 1,
  status: 1,
  transactionDate: -1,
});

const Transaction = mongoose.model("Transaction", transactionSchema);

export default Transaction;
