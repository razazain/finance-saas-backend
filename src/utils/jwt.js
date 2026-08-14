import jwt from "jsonwebtoken";
import crypto from "crypto";

import { env } from "../config/env.js";

export const generateAccessToken = (payload) => {
  return jwt.sign(
    payload,
    env.JWT_ACCESS_SECRET,
    {
      expiresIn: env.JWT_ACCESS_EXPIRES_IN,
      issuer: "finance-saas-api",
      audience: "finance-saas-client"
    }
  );
};

export const generateRefreshToken = (payload) => {
  return jwt.sign(
    payload,
    env.JWT_REFRESH_SECRET,
    {
      expiresIn: env.JWT_REFRESH_EXPIRES_IN,
      issuer: "finance-saas-api",
      audience: "finance-saas-client"
    }
  );
};

export const verifyAccessToken = (token) => {
  return jwt.verify(
    token,
    env.JWT_ACCESS_SECRET,
    {
      issuer: "finance-saas-api",
      audience: "finance-saas-client"
    }
  );
};

export const verifyRefreshToken = (token) => {
  return jwt.verify(
    token,
    env.JWT_REFRESH_SECRET,
    {
      issuer: "finance-saas-api",
      audience: "finance-saas-client"
    }
  );
};

export const generateTokenHash = (token) => {
  return crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");
};