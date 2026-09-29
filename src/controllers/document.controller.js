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
