import mongoose from "mongoose";

const refreshTokenSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },

    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      required: true,
      index: true
    },

    tokenHash: {
      type: String,
      required: true,
      unique: true
    },

    expiresAt: {
      type: Date,
      required: true,
      index: true
    },

    revokedAt: {
      type: Date,
      default: null
    },

    createdByIp: {
      type: String,
      default: null
    },

    userAgent: {
      type: String,
      default: null
    }
  },
  {
    timestamps: true
  }
);

/*
 * MongoDB automatically removes expired
 * refresh-token records.
 */
refreshTokenSchema.index(
  { expireAfterSeconds: 0 }
);

const RefreshToken = mongoose.model(
  "RefreshToken",
  refreshTokenSchema
);

export default RefreshToken;