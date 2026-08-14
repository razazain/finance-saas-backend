import bcrypt from "bcryptjs";

import User from "../models/User.js";
import Business from "../models/Bussiness.js";
import RefreshToken from "../models/RefreshToken.js";

import {
  generateAccessToken,
  generateRefreshToken,
  generateTokenHash,
  verifyRefreshToken
} from "../utils/jwt.js";

import { AppError } from "../utils/appError.js";

const SALT_ROUNDS = 12;

export const registerUser = async ({
  name,
  email,
  password,
  businessName,
  country,
  currency
}) => {
  const session =
    await User.startSession();

  try {
    let result;

    await session.withTransaction(
      async () => {
        const existingUser =
          await User.findOne({ email })
            .session(session);

        if (existingUser) {
          throw new AppError(
            "An account with this email already exists",
            409,
            "EMAIL_ALREADY_EXISTS"
          );
        }

        const hashedPassword =
          await bcrypt.hash(
            password,
            SALT_ROUNDS
          );

        /*
         * Create business first.
         */
        const business =
          new Business({
            name: businessName,
            ownerId: null,
            currency,
            country
          });

        await business.save({
          session
        });

        /*
         * Create owner.
         */
        const user =
          new User({
            businessId: business._id,
            name,
            email,
            password: hashedPassword,
            role: "owner"
          });

        await user.save({
          session
        });

        /*
         * Assign owner.
         */
        business.ownerId =
          user._id;

        await business.save({
          session
        });

        /*
         * Generate authentication tokens.
         */
        const payload = {
          userId:
            user._id.toString(),

          businessId:
            business._id.toString(),

          role: user.role
        };

        const accessToken =
          generateAccessToken(
            payload
          );

        const refreshToken =
          generateRefreshToken(
            payload
          );

        /*
         * Store only the hash of
         * the refresh token.
         */
        const tokenHash =
          generateTokenHash(
            refreshToken
          );

        const refreshTokenDocument =
          new RefreshToken({
            userId: user._id,
            businessId: business._id,
            tokenHash,
            expiresAt:
              getRefreshTokenExpiry()
          });

        await refreshTokenDocument.save({
          session
        });

        result = {
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            businessId:
              business._id
          },

          business: {
            id: business._id,
            name: business.name,
            currency:
              business.currency,
            country:
              business.country
          },

          accessToken,
          refreshToken
        };
      }
    );

    return result;
  } finally {
    await session.endSession();
  }
};

export const loginUser = async ({
  email,
  password,
  ip,
  userAgent
}) => {
  const user =
    await User.findOne({ email })
      .select("+password");

  if (!user) {
    throw new AppError(
      "Invalid email or password",
      401,
      "INVALID_CREDENTIALS"
    );
  }

  if (!user.isActive) {
    throw new AppError(
      "User account is inactive",
      403,
      "USER_INACTIVE"
    );
  }

  const passwordMatches =
    await bcrypt.compare(
      password,
      user.password
    );

  if (!passwordMatches) {
    throw new AppError(
      "Invalid email or password",
      401,
      "INVALID_CREDENTIALS"
    );
  }

  const business =
    await Business.findById(
      user.businessId
    );

  if (!business || !business.isActive) {
    throw new AppError(
      "Business account is inactive",
      403,
      "BUSINESS_INACTIVE"
    );
  }

  user.lastLoginAt =
    new Date();

  await user.save();

  const payload = {
    userId:
      user._id.toString(),

    businessId:
      user.businessId.toString(),

    role:
      user.role
  };

  const accessToken =
    generateAccessToken(
      payload
    );

  const refreshToken =
    generateRefreshToken(
      payload
    );

  await storeRefreshToken({
    userId: user._id,
    businessId: user.businessId,
    refreshToken,
    ip,
    userAgent
  });

  return {
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      businessId:
        user.businessId
    },

    business: {
      id: business._id,
      name: business.name,
      currency:
        business.currency,
      country:
        business.country
    },

    accessToken,
    refreshToken
  };
};

export const refreshUserToken = async ({
  refreshToken
}) => {
  let decoded;

  try {
    decoded =
      verifyRefreshToken(
        refreshToken
      );
  } catch (error) {
    throw new AppError(
      "Invalid or expired refresh token",
      401,
      "INVALID_REFRESH_TOKEN"
    );
  }

  const tokenHash =
    generateTokenHash(
      refreshToken
    );

  const storedToken =
    await RefreshToken.findOne({
      tokenHash,
      userId: decoded.userId,
      businessId:
        decoded.businessId,
      revokedAt: null
    });

  if (!storedToken) {
    throw new AppError(
      "Refresh token is invalid or revoked",
      401,
      "REFRESH_TOKEN_REVOKED"
    );
  }

  if (
    storedToken.expiresAt <=
    new Date()
  ) {
    throw new AppError(
      "Refresh token has expired",
      401,
      "REFRESH_TOKEN_EXPIRED"
    );
  }

  const user =
    await User.findById(
      decoded.userId
    );

  if (!user || !user.isActive) {
    throw new AppError(
      "User account is inactive",
      403,
      "USER_INACTIVE"
    );
  }

  const business =
    await Business.findById(
      decoded.businessId
    );

  if (
    !business ||
    !business.isActive
  ) {
    throw new AppError(
      "Business account is inactive",
      403,
      "BUSINESS_INACTIVE"
    );
  }

  /*
   * Rotate refresh token.
   *
   * Old token becomes invalid.
   */
  storedToken.revokedAt =
    new Date();

  await storedToken.save();

  const payload = {
    userId:
      user._id.toString(),

    businessId:
      business._id.toString(),

    role:
      user.role
  };

  const newAccessToken =
    generateAccessToken(
      payload
    );

  const newRefreshToken =
    generateRefreshToken(
      payload
    );

  await storeRefreshToken({
    userId: user._id,
    businessId: business._id,
    refreshToken:
      newRefreshToken
  });

  return {
    accessToken:
      newAccessToken,

    refreshToken:
      newRefreshToken
  };
};

export const logoutUser = async ({
  refreshToken
}) => {
  if (!refreshToken) {
    return;
  }

  const tokenHash =
    generateTokenHash(
      refreshToken
    );

  await RefreshToken.updateOne(
    {
      tokenHash,
      revokedAt: null
    },
    {
      $set: {
        revokedAt: new Date()
      }
    }
  );
};

const storeRefreshToken = async ({
  userId,
  businessId,
  refreshToken,
  ip = null,
  userAgent = null
}) => {
  const tokenHash =
    generateTokenHash(
      refreshToken
    );

  await RefreshToken.create({
    userId,
    businessId,
    tokenHash,
    expiresAt:
      getRefreshTokenExpiry(),
    createdByIp: ip,
    userAgent
  });
};

const getRefreshTokenExpiry = () => {
  /*
   * Current configuration is 7 days.
   *
   * This can be improved later to
   * parse JWT_REFRESH_EXPIRES_IN
   * dynamically.
   */

  const days = 7;

  return new Date(
    Date.now() +
      days *
        24 *
        60 *
        60 *
        1000
  );
};