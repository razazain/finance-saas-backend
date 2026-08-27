import Account from "../models/Account.js";
import Business from "../models/Bussiness.js";

import { AppError } from "../utils/appError.js";

export const createAccount = async ({
  businessId,
  userId,
  name,
  type,
  description,
  currency,
  openingBalance
}) => {
  const business =
    await Business.findOne({
      _id: businessId,
      isActive: true
    }).select(
      "_id currency"
    );

  if (!business) {
    throw new AppError(
      "Business not found",
      404,
      "BUSINESS_NOT_FOUND"
    );
  }

  const normalizedName =
    normalizeAccountName(name);

  const existingAccount =
    await Account.findOne({
      businessId,
      name: normalizedName
    });

  if (existingAccount) {
    throw new AppError(
      "An account with this name already exists",
      409,
      "ACCOUNT_ALREADY_EXISTS"
    );
  }

  const accountCurrency =
    business.currency;

  const opening =
    openingBalance || "0";

  const account =
    await Account.create({
      businessId,

      name:
        normalizedName,

      type,

      description:
        description || null,

      currency:
        accountCurrency,

      openingBalance:
        opening,

      currentBalance:
        opening,

      isActive: true,

      isSystem: false,

      createdBy:
        userId,

      updatedBy:
        userId
    });

  return formatAccount(
    account
  );
};

export const getAccounts = async ({
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
    filter.isActive =
      isActive;
  }

  const accounts =
    await Account.find(filter)
      .select(
        "_id name type description currency openingBalance currentBalance isActive isSystem createdBy updatedBy createdAt updatedAt"
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

  return accounts.map(
    formatAccount
  );
};

export const getAccountById =
  async ({
    businessId,
    accountId
  }) => {
    const account =
      await Account.findOne({
        _id: accountId,
        businessId
      })
        .select(
          "_id name type description currency openingBalance currentBalance isActive isSystem createdBy updatedBy createdAt updatedAt"
        )
        .populate(
          "createdBy",
          "_id name email"
        )
        .populate(
          "updatedBy",
          "_id name email"
        );

    if (!account) {
      throw new AppError(
        "Account not found",
        404,
        "ACCOUNT_NOT_FOUND"
      );
    }

    return formatAccount(
      account
    );
  };

export const updateAccount =
  async ({
    businessId,
    accountId,
    userId,
    name,
    description
  }) => {
    const account =
      await Account.findOne({
        _id: accountId,
        businessId
      });

    if (!account) {
      throw new AppError(
        "Account not found",
        404,
        "ACCOUNT_NOT_FOUND"
      );
    }

    if (account.isSystem) {
      throw new AppError(
        "System accounts cannot be modified",
        403,
        "SYSTEM_ACCOUNT_MODIFICATION_FORBIDDEN"
      );
    }

    if (name !== undefined) {
      const normalizedName =
        normalizeAccountName(
          name
        );

      const duplicate =
        await Account.findOne({
          _id: {
            $ne: account._id
          },

          businessId,

          name:
            normalizedName
        });

      if (duplicate) {
        throw new AppError(
          "An account with this name already exists",
          409,
          "ACCOUNT_ALREADY_EXISTS"
        );
      }

      account.name =
        normalizedName;
    }

    if (
      description !==
      undefined
    ) {
      account.description =
        description;
    }

    account.updatedBy =
      userId;

    await account.save();

    return formatAccount(
      account
    );
  };

export const updateAccountStatus =
  async ({
    businessId,
    accountId,
    userId,
    isActive
  }) => {
    const account =
      await Account.findOne({
        _id: accountId,
        businessId
      });

    if (!account) {
      throw new AppError(
        "Account not found",
        404,
        "ACCOUNT_NOT_FOUND"
      );
    }

    if (account.isSystem) {
      throw new AppError(
        "System accounts cannot be deactivated",
        403,
        "SYSTEM_ACCOUNT_STATUS_FORBIDDEN"
      );
    }

    /*
     * An account with financial activity
     * should not eventually be deleted.
     *
     * Deactivation is the correct approach.
     */
    account.isActive =
      isActive;

    account.updatedBy =
      userId;

    await account.save();

    return formatAccount(
      account
    );
  };

const normalizeAccountName =
  (name) => {
    return name
      .trim()
      .replace(/\s+/g, " ");
  };

const formatDecimal =
  (value) => {
    if (
      value === null ||
      value === undefined
    ) {
      return "0";
    }

    return value.toString();
  };

const formatAccount =
  (account) => {
    const object =
      account.toObject
        ? account.toObject()
        : account;

    return {
      ...object,

      openingBalance:
        formatDecimal(
          object.openingBalance
        ),

      currentBalance:
        formatDecimal(
          object.currentBalance
        )
    };
  };
