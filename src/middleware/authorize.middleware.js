import { AppError } from "../utils/appError.js";

export const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(
        new AppError(
          "Authentication required",
          401,
          "AUTHENTICATION_REQUIRED"
        )
      );
    }

    if (
      !allowedRoles.includes(req.user.role)
    ) {
      return next(
        new AppError(
          "You do not have permission to perform this action",
          403,
          "FORBIDDEN"
        )
      );
    }

    next();
  };
};