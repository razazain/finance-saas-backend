import User from "../models/User.js";
import { AppError } from "../utils/appError.js";
import {
  verifyAccessToken
} from "../utils/jwt.js";

export const authenticate = async (
  req,
  res,
  next
) => {
  try {
    const authorization =
      req.headers.authorization;

    if (!authorization) {
      throw new AppError(
        "Authentication required",
        401,
        "AUTHENTICATION_REQUIRED"
      );
    }

    const [scheme, token] =
      authorization.split(" ");

    if (
      scheme !== "Bearer" ||
      !token
    ) {
      throw new AppError(
        "Invalid authorization header",
        401,
        "INVALID_AUTH_HEADER"
      );
    }

    const decoded =
      verifyAccessToken(token);

    const user = await User.findById(
      decoded.userId
    ).select(
      "_id businessId name email role isActive"
    );

    if (!user) {
      throw new AppError(
        "User not found",
        401,
        "USER_NOT_FOUND"
      );
    }

    if (!user.isActive) {
      throw new AppError(
        "User account is inactive",
        403,
        "USER_INACTIVE"
      );
    }

    req.user = {
      userId: user._id.toString(),
      businessId: user.businessId.toString(),
      name: user.name,
      email: user.email,
      role: user.role
    };

    next();
  } catch (error) {
    if (
      error.name === "JsonWebTokenError" ||
      error.name === "TokenExpiredError"
    ) {
      return next(
        new AppError(
          "Invalid or expired access token",
          401,
          "INVALID_ACCESS_TOKEN"
        )
      );
    }

    next(error);
  }
};