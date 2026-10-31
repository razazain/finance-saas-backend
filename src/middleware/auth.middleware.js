import { AppError } from "../utils/appError.js";
import { verifyAccessToken } from "../utils/jwt.js";
import User from "../models/User.js";
import Business from "../models/Bussiness.js";

export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      throw new AppError(
        "Authentication required",
        401,
        "AUTHENTICATION_REQUIRED",
      );
    }

    const [scheme, token] = authHeader.split(" ");

    if (scheme !== "Bearer" || !token) {
      throw new AppError(
        "Invalid authorization header format",
        401,
        "INVALID_AUTHORIZATION_HEADER",
      );
    }

    let decoded;

    try {
      decoded = verifyAccessToken(token);
    } catch (error) {
      if (error.name === "TokenExpiredError") {
        throw new AppError(
          "Access token has expired",
          401,
          "ACCESS_TOKEN_EXPIRED",
        );
      }

      throw new AppError("Invalid access token", 401, "INVALID_ACCESS_TOKEN");
    }

    const user = await User.findById(decoded.userId).select(
      "_id businessId role isActive",
    );

    if (!user) {
      throw new AppError("User not found", 401, "USER_NOT_FOUND");
    }

    if (!user.isActive) {
      throw new AppError("User account is inactive", 403, "USER_INACTIVE");
    }

    const business = await Business.findOne({
      _id: user.businessId,
      isActive: true,
    }).select("_id");
    if (!business) {
      throw new AppError(
        "Business account is inactive",
        403,
        "BUSINESS_INACTIVE",
      );
    }

    req.user = {
      userId: user._id.toString(),
      businessId: user.businessId.toString(),
      role: user.role,
    };

    next();
  } catch (error) {
    next(error);
  }
};
