import bcrypt from "bcryptjs";

import User from "../models/User.js";
import Business from "../models/Bussiness.js";

import {
  generateAccessToken,
  generateRefreshToken
} from "../utils/jwt.js";

import {
  AppError
} from "../utils/appError.js";

const SALT_ROUNDS = 12;

export const registerUser = async ({
  name,
  email,
  password,
  businessName,
  country,
  currency
}) => {
  const existingUser =
    await User.findOne({ email });

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
   * We create the business first.
   * The ownerId is temporarily unavailable,
   * so we create the user after the business.
   */

  const business =
    await Business.create({
      name: businessName,
      ownerId: undefined,
      currency,
      country
    });

  const user =
    await User.create({
      businessId: business._id,
      name,
      email,
      password: hashedPassword,
      role: "owner"
    });

  /*
   * Now that we have the user,
   * update the business owner.
   */

  business.ownerId = user._id;

  await business.save();

  const payload = {
    userId: user._id.toString(),
    businessId: business._id.toString(),
    role: user.role
  };

  const accessToken =
    generateAccessToken(payload);

  const refreshToken =
    generateRefreshToken(payload);

  return {
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      businessId: business._id
    },

    business: {
      id: business._id,
      name: business.name,
      currency: business.currency,
      country: business.country
    },

    accessToken,
    refreshToken
  };
};

export const loginUser = async ({
  email,
  password
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

  user.lastLoginAt = new Date();

  await user.save();

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

  const payload = {
    userId: user._id.toString(),
    businessId: user.businessId.toString(),
    role: user.role
  };

  const accessToken =
    generateAccessToken(payload);

  const refreshToken =
    generateRefreshToken(payload);

  return {
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      businessId: user.businessId
    },

    business: {
      id: business._id,
      name: business.name,
      currency: business.currency,
      country: business.country
    },

    accessToken,
    refreshToken
  };
};