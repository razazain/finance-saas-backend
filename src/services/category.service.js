import Category from "../models/Category.js";
import Business from "../models/Bussiness.js";

import { AppError } from "../utils/appError.js";

export const createCategory = async ({
  businessId,
  userId,
  name,
  type,
  description
}) => {
  /*
   * Make sure the business still exists
   * and is active.
   */
  const business =
    await Business.findOne({
      _id: businessId,
      isActive: true
    }).select("_id");

  if (!business) {
    throw new AppError(
      "Business not found",
      404,
      "BUSINESS_NOT_FOUND"
    );
  }

  /*
   * Normalize name for duplicate checking.
   *
   * MongoDB unique indexes are case-sensitive
   * unless a collation/index strategy is used.
   *
   * We normalize the stored name to make
   * duplicate prevention predictable.
   */
  const normalizedName =
    normalizeCategoryName(name);

  const existingCategory =
    await Category.findOne({
      businessId,
      type,
      name: normalizedName
    });

  if (existingCategory) {
    throw new AppError(
      "A category with this name and type already exists",
      409,
      "CATEGORY_ALREADY_EXISTS"
    );
  }

  const category =
    await Category.create({
      businessId,
      name: normalizedName,
      type,
      description:
        description || null,
      isActive: true,
      isSystem: false,
      createdBy: userId,
      updatedBy: userId
    });

  return category;
};

export const getCategories = async ({
  businessId,
  type,
  isActive
}) => {
  const filter = {
    businessId
  };

  if (type) {
    filter.type = type;
  }

  if (isActive !== undefined) {
    filter.isActive = isActive;
  }

  return Category.find(filter)
    .select(
      "_id name type description isActive isSystem createdBy updatedBy createdAt updatedAt"
    )
    .populate(
      "createdBy",
      "_id name email"
    )
    .populate(
      "updatedBy",
      "_id name email"
    )
    .sort({
      type: 1,
      name: 1
    });
};

export const getCategoryById = async ({
  businessId,
  categoryId
}) => {
  const category =
    await Category.findOne({
      _id: categoryId,
      businessId
    })
      .select(
        "_id name type description isActive isSystem createdBy updatedBy createdAt updatedAt"
      )
      .populate(
        "createdBy",
        "_id name email"
      )
      .populate(
        "updatedBy",
        "_id name email"
      );

  if (!category) {
    throw new AppError(
      "Category not found",
      404,
      "CATEGORY_NOT_FOUND"
    );
  }

  return category;
};

export const updateCategory = async ({
  businessId,
  categoryId,
  userId,
  name,
  description
}) => {
  const category =
    await Category.findOne({
      _id: categoryId,
      businessId
    });

  if (!category) {
    throw new AppError(
      "Category not found",
      404,
      "CATEGORY_NOT_FOUND"
    );
  }

  if (category.isSystem) {
    throw new AppError(
      "System categories cannot be modified",
      403,
      "SYSTEM_CATEGORY_MODIFICATION_FORBIDDEN"
    );
  }

  if (name !== undefined) {
    const normalizedName =
      normalizeCategoryName(name);

    const duplicate =
      await Category.findOne({
        _id: {
          $ne: category._id
        },
        businessId,
        type: category.type,
        name: normalizedName
      });

    if (duplicate) {
      throw new AppError(
        "A category with this name and type already exists",
        409,
        "CATEGORY_ALREADY_EXISTS"
      );
    }

    category.name =
      normalizedName;
  }

  if (description !== undefined) {
    category.description =
      description;
  }

  category.updatedBy =
    userId;

  await category.save();

  return category;
};

export const updateCategoryStatus =
  async ({
    businessId,
    categoryId,
    userId,
    isActive
  }) => {
    const category =
      await Category.findOne({
        _id: categoryId,
        businessId
      });

    if (!category) {
      throw new AppError(
        "Category not found",
        404,
        "CATEGORY_NOT_FOUND"
      );
    }

    if (category.isSystem) {
      throw new AppError(
        "System categories cannot be deactivated",
        403,
        "SYSTEM_CATEGORY_STATUS_FORBIDDEN"
      );
    }

    category.isActive =
      isActive;

    category.updatedBy =
      userId;

    await category.save();

    return category;
  };

const normalizeCategoryName =
  (name) => {
    return name
      .trim()
      .replace(/\s+/g, " ");
  };