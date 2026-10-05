import { asyncHandler } from "../utils/asyncHandler.js";
import { successResponse } from "../utils/response.js";
import {
  initDocumentUpload,
  completeDocumentUpload,
  listDocuments,
  getDocument,
  processDocument,
  convertDocument,
  deleteDocument,
} from "../services/document.service.js";

export const initUpload = asyncHandler(async (req, res) => {
  const result = await initDocumentUpload({
    businessId: req.user.businessId,
    userId: req.user.userId,
    ...req.validated.body,
  });
  return successResponse({
    res,
    statusCode: 201,
    message: "Document upload initialized",
    data: result,
  });
});

export const completeUpload = asyncHandler(async (req, res) => {
  const document = await completeDocumentUpload({
    businessId: req.user.businessId,
    documentId: req.validated.params.id,
    ...req.validated.body,
  });
  return successResponse({
    res,
    message: "Document upload completed",
    data: { document },
  });
});

export const list = asyncHandler(async (req, res) => {
  const result = await listDocuments({
    businessId: req.user.businessId,
    ...req.validated.query,
  });
  return successResponse({
    res,
    message: "Documents retrieved successfully",
    data: result,
  });
});

export const getOne = asyncHandler(async (req, res) => {
  const document = await getDocument({
    businessId: req.user.businessId,
    documentId: req.validated.params.id,
  });
  return successResponse({
    res,
    message: "Document retrieved successfully",
    data: { document },
  });
});

export const process = asyncHandler(async (req, res) => {
  const document = await processDocument({
    businessId: req.user.businessId,
    documentId: req.validated.params.id,
  });
  return successResponse({
    res,
    message: "Document OCR processed successfully",
    data: { document },
  });
});

export const convert = asyncHandler(async (req, res) => {
  const result = await convertDocument({
    businessId: req.user.businessId,
    userId: req.user.userId,
    documentId: req.validated.params.id,
    payload: req.validated.body,
  });
  return successResponse({
    res,
    message: "Document converted successfully",
    data: result,
  });
});

export const remove = asyncHandler(async (req, res) => {
  const result = await deleteDocument({
    businessId: req.user.businessId,
    documentId: req.validated.params.id,
  });
  return successResponse({
    res,
    message: "Document deleted successfully",
    data: result,
  });
});

import Document from "../models/Document.js";
import { AppError } from "../utils/appError.js";
export const classify = asyncHandler(async (req, res) => {
  const d = await Document.findOne({
    _id: req.validated.params.id,
    businessId: req.user.businessId,
  });
  if (!d) throw new AppError("Document not found", 404, "DOCUMENT_NOT_FOUND");
  const text = JSON.stringify(d.extractedData || {}).toLowerCase();
  let type = "unknown",
    confidence = 0.25;
  if (/invoice|invoice number|inv-/.test(text)) {
    type = "invoice";
    confidence = 0.9;
  } else if (/bill|vendor bill/.test(text)) {
    type = "bill";
    confidence = 0.9;
  } else if (/receipt|paid|cashier/.test(text)) {
    type = "receipt";
    confidence = 0.75;
  } else if (/statement|opening balance|closing balance/.test(text)) {
    type = "statement";
    confidence = 0.8;
  } else if (/expense/.test(text)) {
    type = "expense";
    confidence = 0.6;
  } else if (/income|payment received/.test(text)) {
    type = "income";
    confidence = 0.6;
  }
  d.classification = type;
  d.classificationConfidence = confidence;
  await d.save();
  return successResponse({
    res,
    message: "Document classified",
    data: { document: d },
  });
});
export const review = asyncHandler(async (req, res) => {
  const d = await Document.findOne({
    _id: req.validated.params.id,
    businessId: req.user.businessId,
  });
  if (!d) throw new AppError("Document not found", 404, "DOCUMENT_NOT_FOUND");
  if (d.conversion.status === "converted")
    throw new AppError(
      "Converted documents cannot be edited",
      409,
      "DOCUMENT_ALREADY_CONVERTED",
    );
  d.extractedData = req.validated.body.extractedData;
  await d.save();
  return successResponse({
    res,
    message: "Document review data saved",
    data: { document: d },
  });
});
export const content = asyncHandler(async (req, res) => {
  const d = await Document.findOne({
    _id: req.validated.params.id,
    businessId: req.user.businessId,
  });
  if (!d) throw new AppError("Document not found", 404, "DOCUMENT_NOT_FOUND");
  if (!d.cloudinary?.secureUrl || d.cloudinary.secureUrl === "pending")
    throw new AppError(
      "Document asset is unavailable",
      404,
      "DOCUMENT_ASSET_UNAVAILABLE",
    );
  const r = await fetch(d.cloudinary.secureUrl);
  if (!r.ok)
    throw new AppError(
      "Document asset could not be retrieved",
      502,
      "DOCUMENT_ASSET_FETCH_FAILED",
    );
  res.set("Content-Type", d.mimeType);
  res.set("Cache-Control", "private, no-store");
  res.send(Buffer.from(await r.arrayBuffer()));
});
