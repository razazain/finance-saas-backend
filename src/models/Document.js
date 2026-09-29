import mongoose from "mongoose";

const documentSchema = new mongoose.Schema(
  {
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      required: true,
      index: true,
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    originalFileName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 255,
    },
    mimeType: {
      type: String,
      required: true,
      enum: ["application/pdf", "image/jpeg", "image/png", "image/webp"],
    },
    fileSize: {
      type: Number,
      required: true,
      min: 1,
      max: 15 * 1024 * 1024,
    },
    cloudinary: {
      publicId: { type: String, required: true },
      secureUrl: { type: String, required: true },
      resourceType: { type: String, required: true },
      format: { type: String, default: null },
      folder: { type: String, required: true },
    },
    documentType: {
      type: String,
      enum: [
        "invoice",
        "bill",
        "receipt",
        "expense_receipt",
        "income_receipt",
        "statement",
        "other",
      ],
      default: "other",
    },
    processingStatus: {
      type: String,
      enum: ["uploading", "uploaded", "processing", "processed", "failed"],
      default: "uploading",
      index: true,
    },
    processingError: {
      type: String,
      maxlength: 2000,
      default: null,
    },
    extractedData: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    conversion: {
      status: {
        type: String,
        enum: ["not_converted", "converted"],
        default: "not_converted",
      },
      targetType: {
        type: String,
        enum: ["invoice", "bill", "transaction", null],
        default: null,
      },
      targetId: {
        type: mongoose.Schema.Types.ObjectId,
        default: null,
      },
      convertedAt: {
        type: Date,
        default: null,
      },
      convertedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },
    },
  },
  { timestamps: true },
);

documentSchema.index({ businessId: 1, createdAt: -1 });
documentSchema.index({ businessId: 1, processingStatus: 1, createdAt: -1 });

documentSchema.index(
  { businessId: 1, "cloudinary.publicId": 1 },
  { unique: true },
);

const Document = mongoose.model("Document", documentSchema);
export default Document;
