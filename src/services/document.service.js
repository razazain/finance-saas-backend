import mongoose from "mongoose";
import Document from "../models/Document.js";
import Business from "../models/Bussiness.js";
import { AppError } from "../utils/appError.js";
import {
  createDocumentUploadSignature,
  destroyCloudinaryAsset,
  isValidDocumentAsset,
} from "../utils/cloudinary.js";
import { processDocumentWithOcr } from "./ocr.service.js";
import { createInvoice } from "./invoice.service.js";
import { createBill } from "./bill.service.js";
import { createTransaction } from "./transaction.service.js";
import Transaction from "../models/Transaction.js";
import Invoice from "../models/Invoice.js";
import Bill from "../models/Bill.js";
import { env } from "../config/env.js";
import { isGroqEnabled } from "./groq.service.js";
import { extractDocumentFieldsWithAi } from "./aiDocument.service.js";

const toObject = (doc) => (doc?.toObject ? doc.toObject() : doc);

const ensureBusiness = async (businessId) => {
  const business = await Business.findOne({
    _id: businessId,
    isActive: true,
  }).select("_id currency");
  if (!business)
    throw new AppError("Business not found", 404, "BUSINESS_NOT_FOUND");
  return business;
};

export const initDocumentUpload = async ({
  businessId,
  userId,
  originalFileName,
  mimeType,
  fileSize,
  documentType = "other",
}) => {
  await ensureBusiness(businessId);
  const document = await Document.create({
    businessId,
    uploadedBy: userId,
    originalFileName,
    mimeType,
    fileSize,
    documentType,
    processingStatus: "uploading",
  });

  const folder = `financeSaaS/businesses/${businessId}/documents/${document._id}`;
  const upload = createDocumentUploadSignature({
    businessId,
    documentId: document._id,
  });

  document.cloudinary = {
    publicId: `${folder}/${document._id}`,
    secureUrl: "pending",
    resourceType: "auto",
    format: null,
    folder,
  };
  await document.save();

  return { document: toObject(document), upload };
};

export const completeDocumentUpload = async ({
  businessId,
  documentId,
  publicId,
  secureUrl,
  resourceType,
  format,
}) => {
  const document = await Document.findOne({ _id: documentId, businessId });
  if (!document)
    throw new AppError("Document not found", 404, "DOCUMENT_NOT_FOUND");

  const expectedPublicId = `financeSaaS/businesses/${businessId}/documents/${documentId}/${documentId}`;
  if (
    publicId !== expectedPublicId ||
    !isValidDocumentAsset({ businessId, documentId, publicId, secureUrl })
  ) {
    throw new AppError(
      "Invalid Cloudinary asset for this document",
      400,
      "INVALID_DOCUMENT_ASSET",
    );
  }

  document.cloudinary = {
    publicId,
    secureUrl,
    resourceType,
    format: format || null,
    folder: `financeSaaS/businesses/${businessId}/documents/${documentId}`,
  };
  document.processingStatus = "uploaded";
  document.processingError = null;
  await document.save();
  return toObject(document);
};

export const listDocuments = async ({
  businessId,
  processingStatus,
  documentType,
  page = 1,
  limit = 25,
}) => {
  const filter = { businessId };
  if (processingStatus) filter.processingStatus = processingStatus;
  if (documentType) filter.documentType = documentType;
  const skip = (page - 1) * limit;
  const [documents, total] = await Promise.all([
    Document.find(filter)
      .populate("uploadedBy", "_id name email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Document.countDocuments(filter),
  ]);
  return {
    documents: documents.map(toObject),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

export const getDocument = async ({ businessId, documentId }) => {
  const document = await Document.findOne({
    _id: documentId,
    businessId,
  }).populate("uploadedBy", "_id name email");
  if (!document)
    throw new AppError("Document not found", 404, "DOCUMENT_NOT_FOUND");
  return toObject(document);
};

export const extractDocumentWithAi = async ({ businessId, documentId }) => {
  if (!env.GROQ_DOCUMENT_EXTRACTION_ENABLED) {
    throw new AppError("AI document extraction is disabled by configuration", 503, "AI_DOCUMENT_EXTRACTION_DISABLED");
  }
  if (!isGroqEnabled()) {
    throw new AppError("Groq AI is not configured", 503, "AI_NOT_CONFIGURED");
  }

  const document = await Document.findOne({ _id: documentId, businessId });
  if (!document) throw new AppError("Document not found", 404, "DOCUMENT_NOT_FOUND");
  if (document.processingStatus !== "processed" || !document.extractedData?.rawText) {
    throw new AppError("Document must complete OCR processing before AI extraction", 409, "DOCUMENT_OCR_REQUIRED");
  }

  const ai = await extractDocumentFieldsWithAi({
    rawText: document.extractedData.rawText,
    fileName: document.originalFileName,
    expectedDocumentType: document.documentType,
  });
  document.extractedData = {
    ...(document.extractedData?.toObject?.() || document.extractedData),
    ai,
  };
  if (["invoice", "bill", "receipt", "statement"].includes(ai.classification)) {
    document.classification = ai.classification;
    document.classificationConfidence = ai.confidence;
  } else if (["expense", "income"].includes(ai.classification)) {
    document.classification = ai.classification;
    document.classificationConfidence = ai.confidence;
  }
  await document.save();
  return toObject(document);
};

export const processDocument = async ({ businessId, documentId }) => {
  const document = await Document.findOne({ _id: documentId, businessId });
  if (!document)
    throw new AppError("Document not found", 404, "DOCUMENT_NOT_FOUND");
  if (document.processingStatus === "uploading")
    throw new AppError(
      "Upload is not complete",
      409,
      "DOCUMENT_UPLOAD_INCOMPLETE",
    );
  if (document.processingStatus === "processing")
    throw new AppError(
      "Document is already being processed",
      409,
      "DOCUMENT_PROCESSING",
    );

  document.processingStatus = "processing";
  document.processingError = null;
  await document.save();

  try {
    const result = await processDocumentWithOcr({ document });

    // OCR remains the fallback/source text. Groq adds a separate, reviewable
    // normalized extraction and never creates a financial record by itself.
    if (env.GROQ_DOCUMENT_EXTRACTION_ENABLED && isGroqEnabled() && result.rawText) {
      try {
        result.ai = await extractDocumentFieldsWithAi({
          rawText: result.rawText,
          fileName: document.originalFileName,
          expectedDocumentType: document.documentType,
        });
        const aiType = result.ai.classification;
        if (document.documentType === "other" && ["invoice", "bill", "receipt", "statement"].includes(aiType)) {
          document.documentType = aiType;
        }
        if (aiType === "invoice" || aiType === "bill" || aiType === "receipt" || aiType === "statement") {
          document.classification = aiType;
          document.classificationConfidence = result.ai.confidence;
        } else if (aiType === "expense") {
          document.classification = "expense";
          document.classificationConfidence = result.ai.confidence;
        } else if (aiType === "income") {
          document.classification = "income";
          document.classificationConfidence = result.ai.confidence;
        }
      } catch (aiError) {
        // A provider outage or free-tier quota must not break successful OCR.
        result.ai = {
          provider: "groq",
          status: "failed",
          errorCode: aiError.code || "AI_EXTRACTION_FAILED",
          reviewRequired: true,
        };
      }
    } else {
      result.ai = {
        provider: "groq",
        status: isGroqEnabled() ? "disabled_by_configuration" : "not_configured",
        reviewRequired: true,
      };
    }

    document.extractedData = result;
    document.processingStatus = "processed";
    await document.save();
    return toObject(document);
  } catch (error) {
    document.processingStatus = "failed";
    document.processingError = error.message;
    await document.save();
    throw error;
  }
};

const extractedAmount = (document) =>
  document.extractedData?.ai?.fields?.totalAmount ||
  document.extractedData?.ai?.fields?.dueAmount ||
  document.extractedData?.extracted?.fields?.totalAmount ||
  document.extractedData?.extracted?.fields?.dueAmount ||
  document.extractedData?.extracted?.fields?.paidAmount ||
  null;
const extractedDate = (document) =>
  document.extractedData?.ai?.fields?.date ||
  document.extractedData?.extracted?.fields?.date ||
  null;
const extractedDescription = (document) => {
  const aiItems = document.extractedData?.ai?.lineItems || [];
  if (aiItems.length) return aiItems.slice(0, 3).map((item) => item.description).join("; ");
  return document.extractedData?.extracted?.lines?.slice(0, 3).join(" ") || document.originalFileName;
};

export const convertDocument = async ({
  businessId,
  userId,
  documentId,
  payload,
}) => {
  const document = await Document.findOne({ _id: documentId, businessId });
  if (!document)
    throw new AppError("Document not found", 404, "DOCUMENT_NOT_FOUND");
  if (document.processingStatus !== "processed")
    throw new AppError(
      "Document must be processed before conversion",
      409,
      "DOCUMENT_NOT_PROCESSED",
    );
  if (document.conversion.status === "converted")
    throw new AppError(
      "Document has already been converted",
      409,
      "DOCUMENT_ALREADY_CONVERTED",
    );
  if (document.conversion.status === "processing")
    throw new AppError(
      "Document conversion is already in progress",
      409,
      "DOCUMENT_CONVERSION_IN_PROGRESS",
    );

  const existingSourceFilter = { businessId, sourceDocumentId: document._id };
  const Existing =
    payload.targetType === "invoice"
      ? Invoice
      : payload.targetType === "bill"
        ? Bill
        : Transaction;
  const existingRecord = await Existing.findOne(existingSourceFilter).select("_id");
  if (existingRecord) {
    document.conversion = {
      status: "converted",
      targetType: payload.targetType,
      targetId: existingRecord._id,
      convertedAt: new Date(),
      convertedBy: userId,
    };
    await document.save();
    return { document: toObject(document), record: existingRecord };
  }

  const business = await ensureBusiness(businessId);
  const amount = payload.amount || extractedAmount(document);
  const aiFields = document.extractedData?.ai?.fields || {};
  const detectedCurrency = String(
    aiFields.currency || document.extractedData?.extracted?.fields?.currency || "",
  ).trim().toUpperCase();
  if (/^[A-Z]{3}$/.test(detectedCurrency) && detectedCurrency !== business.currency) {
    throw new AppError(
      `Document currency ${detectedCurrency} does not match business currency ${business.currency}. Convert or correct the currency before creating a financial record.`,
      409,
      "DOCUMENT_CURRENCY_MISMATCH",
    );
  }
  const extractedItems = (document.extractedData?.ai?.lineItems || [])
    .filter((item) => item.description && item.quantity && item.unitPrice)
    .map((item) => ({
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      categoryId: payload.categoryId,
    }));
  const date =
    payload.issueDate ||
    payload.billDate ||
    payload.transactionDate ||
    extractedDate(document) ||
    new Date().toISOString();
  const description = payload.description || extractedDescription(document);

  // Validate before switching the conversion state to processing. This keeps
  // a missing-amount document retryable instead of leaving it stuck.
  if (!amount && !(payload.targetType !== "transaction" && (payload.items?.length || extractedItems.length))) {
    throw new AppError(
      "Amount could not be extracted. Provide amount manually.",
      400,
      "DOCUMENT_AMOUNT_REQUIRED",
    );
  }

  document.conversion = {
    status: "processing",
    targetType: payload.targetType,
    targetId: null,
    convertedAt: null,
    convertedBy: userId,
  };
  await document.save();

  let result;
  let targetId;

  try {
    if (payload.targetType === "invoice" || payload.targetType === "bill") {
      const items = payload.items?.length
        ? payload.items
        : extractedItems.length
          ? extractedItems
          : [{ description, quantity: "1", unitPrice: amount, categoryId: payload.categoryId }];

      if (payload.targetType === "invoice") {
        result = await createInvoice({
          businessId,
          userId,
          customerId: payload.customerId,
          issueDate: date,
          dueDate: payload.dueDate || aiFields.dueDate || date,
          items,
          sourceDocumentId: document._id,
        });
      } else {
        result = await createBill({
          businessId,
          userId,
          vendorId: payload.vendorId,
          billDate: date,
          dueDate: payload.dueDate || aiFields.dueDate || date,
          items,
          sourceDocumentId: document._id,
        });
      }
      targetId = result.id || result._id;
    } else {
      result = await createTransaction({
        businessId,
        userId,
        type: payload.type,
        amount,
        accountId: payload.accountId,
        categoryId: payload.categoryId,
        transactionDate: date,
        description,
        reference: payload.reference || document.originalFileName,
        sourceDocumentId: document._id,
      });
      targetId = result.id || result._id;
    }

    document.conversion = {
      status: "converted",
      targetType: payload.targetType,
      targetId,
      convertedAt: new Date(),
      convertedBy: userId,
    };
    await document.save();
    return { document: toObject(document), record: result };
  } catch (error) {
    await Document.updateOne(
      { _id: documentId, businessId },
      {
        $set: {
          "conversion.status": "not_converted",
          "conversion.targetType": null,
          "conversion.targetId": null,
          "conversion.convertedAt": null,
          "conversion.convertedBy": null,
        },
      },
    ).catch(() => {});
    throw error;
  }
};

export const deleteDocument = async ({ businessId, documentId }) => {
  const document = await Document.findOne({ _id: documentId, businessId });
  if (!document)
    throw new AppError("Document not found", 404, "DOCUMENT_NOT_FOUND");
  if (document.conversion.status === "converted")
    throw new AppError(
      "Converted documents cannot be deleted",
      409,
      "DOCUMENT_CONVERTED",
    );

  if (
    document.cloudinary?.publicId &&
    document.cloudinary?.resourceType &&
    document.cloudinary.secureUrl !== "pending"
  ) {
    await destroyCloudinaryAsset({
      publicId: document.cloudinary.publicId,
      resourceType:
        document.cloudinary.resourceType === "auto"
          ? "image"
          : document.cloudinary.resourceType,
    });
  }
  await Document.deleteOne({ _id: documentId, businessId });
  return { id: documentId };
};
