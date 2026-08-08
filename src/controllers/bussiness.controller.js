import Business from "../models/Bussiness.js";
import { AppError } from "../utils/appError.js";
import { successResponse } from "../utils/response.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const getBusinessProfile =
  asyncHandler(async (req, res) => {
    const business =
      await Business.findOne({
        _id: req.user.businessId,
        isActive: true
      }).select(
        "_id name currency country timezone ownerId createdAt updatedAt"
      );

    if (!business) {
      throw new AppError(
        "Business not found",
        404,
        "BUSINESS_NOT_FOUND"
      );
    }

    return successResponse({
      res,
      message: "Business profile retrieved successfully",
      data: {
        business
      }
    });
  });