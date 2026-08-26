import {
  createCategory,
  getCategories,
  getCategoryById,
  updateCategory,
  updateCategoryStatus
} from "../services/category.service.js";

import {
  successResponse
} from "../utils/response.js";

import {
  asyncHandler
} from "../utils/asyncHandler.js";

export const create =
  asyncHandler(async (req, res) => {
    const category =
      await createCategory({
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
        "Category created successfully",
      data: {
        category
      }
    });
  });

export const list =
  asyncHandler(async (req, res) => {
    const categories =
      await getCategories({
        businessId:
          req.user.businessId,

        ...req.validated.query
      });

    return successResponse({
      res,
      message:
        "Categories retrieved successfully",
      data: {
        categories
      }
    });
  });

export const getOne =
  asyncHandler(async (req, res) => {
    const category =
      await getCategoryById({
        businessId:
          req.user.businessId,

        categoryId:
          req.validated.params.id
      });

    return successResponse({
      res,
      message:
        "Category retrieved successfully",
      data: {
        category
      }
    });
  });

export const update =
  asyncHandler(async (req, res) => {
    const category =
      await updateCategory({
        businessId:
          req.user.businessId,

        categoryId:
          req.validated.params.id,

        userId:
          req.user.userId,

        ...req.validated.body
      });

    return successResponse({
      res,
      message:
        "Category updated successfully",
      data: {
        category
      }
    });
  });

export const updateStatus =
  asyncHandler(async (req, res) => {
    const category =
      await updateCategoryStatus({
        businessId:
          req.user.businessId,

        categoryId:
          req.validated.params.id,

        userId:
          req.user.userId,

        isActive:
          req.validated.body.isActive
      });

    return successResponse({
      res,
      message:
        "Category status updated successfully",
      data: {
        category
      }
    });
  });