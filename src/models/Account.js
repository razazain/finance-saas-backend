import mongoose from "mongoose";

const accountSchema = new mongoose.Schema(
  {
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      required: true,
      index: true
    },

    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100
    },

    type: {
      type: String,
      enum: [
        "cash",
        "bank",
        "wallet",
        "other"
      ],
      required: true
    },

    description: {
      type: String,
      trim: true,
      maxlength: 500,
      default: null
    },

    currency: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      minlength: 3,
      maxlength: 3
    },

    /*
     * Financial values use Decimal128
     * instead of JavaScript floating point.
     *
     * This prevents errors such as:
     *
     * 0.1 + 0.2 !== 0.3
     */
    openingBalance: {
      type: mongoose.Schema.Types.Decimal128,
      default: 0
    },

    /*
     * This will be maintained by the
     * transaction service later.
     *
     * It should NOT be directly editable
     * through the account update API.
     */
    currentBalance: {
      type: mongoose.Schema.Types.Decimal128,
      default: 0
    },

    isActive: {
      type: Boolean,
      default: true
    },

    isSystem: {
      type: Boolean,
      default: false
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    }
  },
  {
    timestamps: true
  }
);

/*
 * An account name must be unique
 * within a business.
 *
 * Example:
 *
 * Business A
 *   Cash       ✅
 *   Bank       ✅
 *
 * Business B
 *   Cash       ✅
 */
accountSchema.index(
  {
    businessId: 1,
    name: 1
  },
  {
    unique: true
  }
);

/*
 * Useful for listing active accounts
 * by type.
 */
accountSchema.index({
  businessId: 1,
  type: 1,
  isActive: 1
});

const Account = mongoose.model(
  "Account",
  accountSchema
);

export default Account;