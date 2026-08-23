import mongoose from "mongoose";
import { env } from "../config/env.js";

export const errorMiddleware = (
  error,
  req,
  res,
  next
) => {
  console.error(error);

  let statusCode = error.statusCode || 500;
  let message = error.message || "Internal server error";
  let code = error.code || "INTERNAL_SERVER_ERROR";

  if (error instanceof mongoose.Error.ValidationError) {
    statusCode = 400;
    code = "DATABASE_VALIDATION_ERROR";
    message = "Invalid data";
  }

  if (error instanceof mongoose.Error.CastError) {
    statusCode = 400;
    code = "INVALID_ID";
    message = "Invalid resource ID";
  }

  if (error.code === 11000) {
    statusCode = 409;
    code = "DUPLICATE_RESOURCE";
    message = "A resource with the same unique value already exists";
  }

  res.status(statusCode).json({
    success: false,
    code,
    message,

    ...(error.details && {
      errors: error.details
    }),

    ...(env.NODE_ENV === "development" && {
      stack: error.stack
    })
  });
};