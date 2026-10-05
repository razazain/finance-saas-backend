import mongoose from "mongoose";
const schema = new mongoose.Schema(
  {
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      required: true,
      unique: true,
    },
    plan: {
      type: String,
      enum: ["free", "starter", "pro", "business"],
      default: "free",
    },
    status: {
      type: String,
      enum: ["active", "trialing", "past_due", "cancelled"],
      default: "active",
    },
    startedAt: { type: Date, default: Date.now },
    currentPeriodStart: { type: Date, default: Date.now },
    currentPeriodEnd: { type: Date, default: null },
    cancelledAt: { type: Date, default: null },
    limits: {
      type: mongoose.Schema.Types.Mixed,
      default: { users: 3, documents: 50 },
    },
  },
  { timestamps: true },
);
export default mongoose.model("Subscription", schema);
