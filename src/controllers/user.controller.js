import {
  createBusinessUser,
  getBusinessUsers,
  getBusinessUserById,
  updateBusinessUser,
  updateUserStatus
} from "../services/user.service.js";

import {
  successResponse
} from "../utils/response.js";

import {
  asyncHandler
} from "../utils/asyncHandler.js";

export const createUser =
  asyncHandler(async (req, res) => {
    const user =
      await createBusinessUser({
        businessId:
          req.user.businessId,

        currentUser:
          req.user,

        ...req.validated.body
      });

    return successResponse({
      res,
      statusCode: 201,
      message:
        "User created successfully",
      data: {
        user
      }
    });
  });

export const getUsers =
  asyncHandler(async (req, res) => {
    const users =
      await getBusinessUsers({
        businessId:
          req.user.businessId
      });

    return successResponse({
      res,
      message:
        "Users retrieved successfully",
      data: {
        users
      }
    });
  });

export const getUserById =
  asyncHandler(async (req, res) => {
    const user =
      await getBusinessUserById({
        businessId:
          req.user.businessId,

        userId:
          req.validated.params.id
      });

    return successResponse({
      res,
      message:
        "User retrieved successfully",
      data: {
        user
      }
    });
  });

export const updateUser =
  asyncHandler(async (req, res) => {
    const user =
      await updateBusinessUser({
        businessId:
          req.user.businessId,

        userId:
          req.validated.params.id,

        currentUser:
          req.user,

        ...req.validated.body
      });

    return successResponse({
      res,
      message:
        "User updated successfully",
      data: {
        user
      }
    });
  });

export const updateStatus =
  asyncHandler(async (req, res) => {
    const user =
      await updateUserStatus({
        businessId:
          req.user.businessId,

        userId:
          req.validated.params.id,

        currentUser:
          req.user,

        isActive:
          req.validated.body.isActive
      });

    return successResponse({
      res,
      message:
        "User status updated successfully",
      data: {
        user
      }
    });
  });