import mongoose from "mongoose";
const schema = new mongoose.Schema(
  {
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      required: true,
      index: true,
    },
    itemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "InventoryItem",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["purchase", "sale", "adjustment", "return"],
      required: true,
    },
    quantity: { type: mongoose.Schema.Types.Decimal128, required: true },
    unitCost: { type: mongoose.Schema.Types.Decimal128, default: "0" },
    reference: { type: String, maxlength: 100, default: null },
    notes: { type: String, maxlength: 1000, default: null },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true },
);
export default mongoose.model("InventoryMovement", schema);
