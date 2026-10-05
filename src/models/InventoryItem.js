import mongoose from "mongoose";
const schema = new mongoose.Schema(
  {
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      required: true,
      index: true,
    },
    sku: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, default: null, maxlength: 1000 },
    unit: { type: String, default: "unit", maxlength: 30 },
    quantity: { type: mongoose.Schema.Types.Decimal128, default: "0" },
    reorderLevel: { type: mongoose.Schema.Types.Decimal128, default: "0" },
    unitCost: { type: mongoose.Schema.Types.Decimal128, default: "0" },
    currency: { type: String, required: true },
    isActive: { type: Boolean, default: true },
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
  { timestamps: true },
);
schema.index({ businessId: 1, sku: 1 }, { unique: true });
export default mongoose.model("InventoryItem", schema);
