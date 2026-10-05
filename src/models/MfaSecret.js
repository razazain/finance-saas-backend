import mongoose from "mongoose";
const schema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      required: true,
      index: true,
    },
    secret: { type: String, required: true },
    enabledAt: { type: Date, default: null },
  },
  { timestamps: true },
);
export default mongoose.model("MfaSecret", schema);
