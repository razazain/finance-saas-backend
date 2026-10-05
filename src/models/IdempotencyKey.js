import mongoose from "mongoose";
const schema = new mongoose.Schema(
  {
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    key: { type: String, required: true },
    method: { type: String, required: true },
    path: { type: String, required: true },
    status: {
      type: String,
      enum: ["processing", "completed"],
      default: "processing",
    },
    statusCode: { type: Number, default: null },
    responseBody: { type: mongoose.Schema.Types.Mixed, default: null },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true },
);
schema.index({ businessId: 1, key: 1 }, { unique: true });
schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
export default mongoose.model("IdempotencyKey", schema);
