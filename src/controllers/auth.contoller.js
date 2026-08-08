import {
  registerUser,
  loginUser
} from "../services/auth.service.js";

import { successResponse } from "../utils/response.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const register = asyncHandler(
  async (req, res) => {
    const result =
      await registerUser(
        req.validated.body
      );

    return successResponse({
      res,
      statusCode: 201,
      message: "Account created successfully",
      data: result
    });
  }
);

export const login = asyncHandler(
  async (req, res) => {
    const result =
      await loginUser(
        req.validated.body
      );

    return successResponse({
      res,
      statusCode: 200,
      message: "Login successful",
      data: result
    });
  }
);