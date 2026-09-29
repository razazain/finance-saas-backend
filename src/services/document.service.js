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
  document.extractedData?.extracted?.fields?.totalAmount ||
  document.extractedData?.extracted?.fields?.dueAmount ||
  document.extractedData?.extracted?.fields?.paidAmount ||
  null;
const extractedDate = (document) =>
  document.extractedData?.extracted?.fields?.date || null;
const extractedDescription = (document) =>
  document.extractedData?.extracted?.lines?.slice(0, 3).join(" ") ||
  document.originalFileName;

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

  const amount = payload.amount || extractedAmount(document);
  if (!amount)
    throw new AppError(
      "Amount could not be extracted. Provide amount manually.",
      400,
      "DOCUMENT_AMOUNT_REQUIRED",
    );
  const date =
    payload.issueDate ||
    payload.billDate ||
    payload.transactionDate ||
    extractedDate(document) ||
    new Date().toISOString();
  const description = payload.description || extractedDescription(document);

  let result;
  let targetId;

  if (payload.targetType === "invoice") {
    result = await createInvoice({
      businessId,
      userId,
      customerId: payload.customerId,
      issueDate: date,
      dueDate: payload.dueDate || date,
      items: [
        {
          description,
          quantity: "1",
          unitPrice: amount,
          categoryId: payload.categoryId,
        },
      ],
    });
    targetId = result.id || result._id;
  } else if (payload.targetType === "bill") {
    result = await createBill({
      businessId,
      userId,
      vendorId: payload.vendorId,
      billDate: date,
      dueDate: payload.dueDate || date,
      items: [
        {
          description,
          quantity: "1",
          unitPrice: amount,
          categoryId: payload.categoryId,
        },
      ],
    });
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
