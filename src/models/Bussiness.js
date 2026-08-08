import mongoose from "mongoose";

const businessSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100
    },

    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false
    },

    currency: {
      type: String,
      default: "PKR",
      uppercase: true,
      trim: true,
      maxlength: 3
    },

    country: {
      type: String,
      trim: true,
      maxlength: 100
    },

    timezone: {
      type: String,
      default: "Asia/Karachi"
    },

    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

businessSchema.index({
  ownerId: 1
});

const Business = mongoose.model(
  "Business",
  businessSchema
);

export default Business;