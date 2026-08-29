import {
  createInvoice,
  getInvoices,
  getInvoiceById,
  updateInvoice,
  updateInvoiceStatus
} from "../services/invoice.service.js";

import {
  successResponse
} from "../utils/response.js";

import {
  asyncHandler
} from "../utils/asyncHandler.js";

export const create =
  asyncHandler(
    async (req, res) => {
      const invoice =
        await createInvoice({
          businessId:
            req.user.businessId,

          userId:
            req.user.userId,

          ...req.validated.body
        });

      return successResponse({
        res,
        statusCode: 201,
        message:
          "Invoice created successfully",
        data: {
          invoice
        }
      });
    }
  );

export const list =
  asyncHandler(
    async (req, res) => {
      const result =
        await getInvoices({
          businessId:
            req.user.businessId,

          ...req.validated.query
        });

      return successResponse({
        res,
        message:
          "Invoices retrieved successfully",
        data: result
      });
    }
  );

export const getOne =
  asyncHandler(
    async (req, res) => {
      const invoice =
        await getInvoiceById({
          businessId:
            req.user.businessId,

          invoiceId:
            req.validated
              .params
              .id
        });

      return successResponse({
        res,
        message:
          "Invoice retrieved successfully",
        data: {
          invoice
        }
      });
    }
  );

export const update =
  asyncHandler(
    async (req, res) => {
      const invoice =
        await updateInvoice({
          businessId:
            req.user.businessId,

          invoiceId:
            req.validated
              .params
              .id,

          userId:
            req.user.userId,

          ...req.validated.body
        });

      return successResponse({
        res,
        message:
          "Invoice updated successfully",
        data: {
          invoice
        }
      });
    }
  );

export const updateStatus =
  asyncHandler(
    async (req, res) => {
      const invoice =
        await updateInvoiceStatus({
          businessId:
            req.user.businessId,

          invoiceId:
            req.validated
              .params
              .id,

          userId:
            req.user.userId,

          status:
            req.validated
              .body
              .status
        });

      return successResponse({
        res,
        message:
          "Invoice status updated successfully",
        data: {
          invoice
        }
      });
    }
  );