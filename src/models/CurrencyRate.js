import mongoose from "mongoose";
const schema = new mongoose.Schema(
  {
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      required: true,
      index: true,
    },
    baseCurrency: { type: String, required: true, uppercase: true },
    quoteCurrency: { type: String, required: true, uppercase: true },
    rate: { type: mongoose.Schema.Types.Decimal128, required: true },
    effectiveAt: { type: Date, required: true, index: true },
    source: { type: String, default: "manual", maxlength: 50 },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true },
);
schema.index({
  businessId: 1,
  baseCurrency: 1,
  quoteCurrency: 1,
  effectiveAt: -1,
});
export default mongoose.model("CurrencyRate", schema);