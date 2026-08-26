import {
  registerUser,
  loginUser,
  refreshUserToken,
  logoutUser
} from "../services/auth.service.js";

import {
  successResponse
} from "../utils/response.js";

import {
  asyncHandler
} from "../utils/asyncHandler.js";
import { env } from "../config/env.js";

const refreshCookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  sameSite: "strict",
  path: "/api/v1/auth",
  maxAge:
    7 *
    24 *
    60 *
    60 *
    1000
};

export const register =
  asyncHandler(async (req, res) => {
    const result =
      await registerUser(
        req.validated.body
      );

    res.cookie(
      "refreshToken",
      result.refreshToken,
      refreshCookieOptions
    );

    return successResponse({
      res,
      statusCode: 201,
      message:
        "Account created successfully",
      data: {
        user: result.user,
        business:
          result.business,
        accessToken:
          result.accessToken
      }
    });
  });

export const login =
  asyncHandler(async (req, res) => {
    const result =
      await loginUser({
        ...req.validated.body,
        ip: req.ip,
        userAgent:
          req.get("user-agent")
      });

    res.cookie(
      "refreshToken",
      result.refreshToken,
      refreshCookieOptions
    );

    return successResponse({
      res,
      message:
        "Login successful",
      data: {
        user: result.user,
        business:
          result.business,
        accessToken:
          result.accessToken
      }
    });
  });

export const refresh =
  asyncHandler(async (req, res) => {
    const refreshToken =
      req.cookies?.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        code:
          "REFRESH_TOKEN_REQUIRED",
        message:
          "Refresh token is required"
      });
    }

    const result =
      await refreshUserToken({
        refreshToken
      });

    res.cookie(
      "refreshToken",
      result.refreshToken,
      refreshCookieOptions
    );

    return successResponse({
      res,
      message:
        "Token refreshed successfully",
      data: {
        accessToken:
          result.accessToken
      }
    });
  });

export const logout =
  asyncHandler(async (req, res) => {
    const refreshToken =
      req.cookies?.refreshToken;

    await logoutUser({
      refreshToken
    });

    res.clearCookie(
      "refreshToken",
      {
        httpOnly: true,
        secure:
          env.NODE_ENV ===
          "production",
        sameSite: "strict",
        path: "/api/v1/auth"
      }
    );

    return successResponse({
      res,
      message:
        "Logout successful"
    });
  });