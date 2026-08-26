import mongoose from "mongoose";

const categorySchema = new mongoose.Schema(
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
        "income",
        "expense"
      ],
      required: true
    },

    description: {
      type: String,
      trim: true,
      maxlength: 500,
      default: null
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
 * Same category name can exist for
 * income and expense, but not twice
 * within the same business/type.
 *
 * Example:
 *
 * Sales + income       ✅
 * Sales + expense      ✅
 *
 * Sales + income       ❌ duplicate
 */
categorySchema.index(
  {
    businessId: 1,
    type: 1,
    name: 1
  },
  {
    unique: true
  }
);

/*
 * Useful for category listing.
 */
categorySchema.index({
  businessId: 1,
  type: 1,
  isActive: 1
});

const Category = mongoose.model(
  "Category",
  categorySchema
);

export default Category;