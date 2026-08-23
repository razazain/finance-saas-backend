import bcrypt from "bcryptjs";

import User from "../models/User.js";
import Business from "../models/Bussiness.js";

import { AppError } from "../utils/appError.js";

const SALT_ROUNDS = 12;

export const createBusinessUser = async ({
  businessId,
  name,
  email,
  password,
  role,
  currentUser
}) => {
  /*
   * Only owner can create admins.
   *
   * Admin can only create employees.
   */
  if (
    role === "admin" &&
    currentUser.role !== "owner"
  ) {
    throw new AppError(
      "Only the business owner can create an admin",
      403,
      "ADMIN_CREATION_FORBIDDEN"
    );
  }

  if (
    role === "employee" &&
    ![
      "owner",
      "admin"
    ].includes(currentUser.role)
  ) {
    throw new AppError(
      "You do not have permission to create users",
      403,
      "USER_CREATION_FORBIDDEN"
    );
  }

  /*
   * Verify business exists and is active.
   */
  const business =
    await Business.findOne({
      _id: businessId,
      isActive: true
    });

  if (!business) {
    throw new AppError(
      "Business not found",
      404,
      "BUSINESS_NOT_FOUND"
    );
  }

  /*
   * Check globally unique email.
   */
  const existingUser =
    await User.findOne({
      email
    });

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

  const user =
    await User.create({
      businessId,
      name,
      email,
      password: hashedPassword,
      role
    });

  return sanitizeUser(user);
};

export const getBusinessUsers = async ({
  businessId
}) => {
  const users =
    await User.find({
      businessId
    })
      .select(
        "_id name email role isActive lastLoginAt createdAt updatedAt"
      )
      .sort({
        createdAt: -1
      });

  return users;
};

export const getBusinessUserById = async ({
  businessId,
  userId
}) => {
  const user =
    await User.findOne({
      _id: userId,
      businessId
    }).select(
      "_id name email role isActive lastLoginAt createdAt updatedAt"
    );

  if (!user) {
    throw new AppError(
      "User not found",
      404,
      "USER_NOT_FOUND"
    );
  }

  return user;
};

export const updateBusinessUser = async ({
  businessId,
  userId,
  name,
  role,
  currentUser
}) => {
  const user =
    await User.findOne({
      _id: userId,
      businessId
    });

  if (!user) {
    throw new AppError(
      "User not found",
      404,
      "USER_NOT_FOUND"
    );
  }

  /*
   * Owner cannot be modified through
   * normal user management.
   */
  if (user.role === "owner") {
    throw new AppError(
      "The business owner cannot be modified through this endpoint",
      403,
      "OWNER_MODIFICATION_FORBIDDEN"
    );
  }

  /*
   * Admin can only manage employees.
   */
  if (
    currentUser.role === "admin"
  ) {
    if (user.role !== "employee") {
      throw new AppError(
        "Admins can only manage employees",
        403,
        "USER_MODIFICATION_FORBIDDEN"
      );
    }

    if (
      role &&
      role !== "employee"
    ) {
      throw new AppError(
        "Admins cannot promote employees to admin",
        403,
        "ROLE_CHANGE_FORBIDDEN"
      );
    }
  }

  /*
   * Owner can modify admin/employee.
   */
  if (name !== undefined) {
    user.name = name;
  }

  if (role !== undefined) {
    user.role = role;
  }

  await user.save();

  return sanitizeUser(user);
};

export const updateUserStatus = async ({
  businessId,
  userId,
  isActive,
  currentUser
}) => {
  const user =
    await User.findOne({
      _id: userId,
      businessId
    });

  if (!user) {
    throw new AppError(
      "User not found",
      404,
      "USER_NOT_FOUND"
    );
  }

  /*
   * Never deactivate owner using
   * normal user-management endpoint.
   */
  if (user.role === "owner") {
    throw new AppError(
      "The business owner cannot be deactivated",
      403,
      "OWNER_DEACTIVATION_FORBIDDEN"
    );
  }

  /*
   * Admin can only activate/deactivate
   * employees.
   */
  if (
    currentUser.role === "admin" &&
    user.role !== "employee"
  ) {
    throw new AppError(
      "Admins can only manage employee status",
      403,
      "STATUS_CHANGE_FORBIDDEN"
    );
  }

  user.isActive = isActive;

  await user.save();

  return sanitizeUser(user);
};

const sanitizeUser = (user) => {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    businessId: user.businessId,
    isActive: user.isActive,
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };
};