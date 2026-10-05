import Business from "../models/Bussiness.js";
import { AppError } from "../utils/appError.js";
import { successResponse } from "../utils/response.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const getBusinessProfile = asyncHandler(async (req, res) => {
  const business = await Business.findOne({
    _id: req.user.businessId,
    isActive: true,
  }).select(
    "_id name currency country timezone ownerId isActive createdAt updatedAt",
  );
  if (!business)
    throw new AppError("Business not found", 404, "BUSINESS_NOT_FOUND");
  return successResponse({
    res,
    message: "Business profile retrieved successfully",
    data: { business },
  });
});

export const updateBusinessProfile = asyncHandler(async (req, res) => {
  const business = await Business.findOne({
    _id: req.user.businessId,
    isActive: true,
  });
  if (!business)
    throw new AppError("Business not found", 404, "BUSINESS_NOT_FOUND");
  const { name, country, currency, timezone } = req.validated.body;
  if (name !== undefined) business.name = name;
  if (country !== undefined) business.country = country;
  if (timezone !== undefined) {
    try {
      Intl.DateTimeFormat(undefined, { timeZone: timezone });
    } catch {
      throw new AppError("Invalid timezone", 400, "INVALID_TIMEZONE");
    }
    business.timezone = timezone;
  }
  if (currency !== undefined && currency !== business.currency) {
    const Account = (await import("../models/Account.js")).default;
    const activeAccounts = await Account.countDocuments({
      businessId: business._id,
      isActive: true,
      currency: { $ne: currency },
    });
    if (activeAccounts)
      throw new AppError(
        "Currency cannot be changed while active accounts use the current currency",
        "409",
        "BUSINESS_CURRENCY_CHANGE_BLOCKED",
      );
    business.currency = currency;
  }
  await business.save();
  return successResponse({
    res,
    message: "Business settings updated successfully",
    data: { business },
  });
});
