import Party from "../models/Party.js";
import Business from "../models/Bussiness.js";

import {
    AppError
} from "../utils/appError.js";

const normalizeName =
    (name) =>
        name
            .trim()
            .replace(/\s+/g, " ");

export const createParty =
    async ({
        businessId,
        userId,
        name,
        type,
        email,
        phone,
        companyName,
        address,
        taxNumber,
        notes
    }) => {

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

        const normalizedName =
            normalizeName(name);

        const existing =
            await Party.findOne({
                businessId,
                type,
                name:
                    normalizedName
            });

        if (existing) {
            throw new AppError(
                "A party with this name and type already exists",
                409,
                "PARTY_ALREADY_EXISTS"
            );
        }

        return Party.create({
            businessId,

            name:
                normalizedName,

            type,

            email:
                email || null,

            phone:
                phone || null,

            companyName:
                companyName || null,

            address:
                address || null,

            taxNumber:
                taxNumber || null,

            notes:
                notes || null,

            isActive: true,

            createdBy:
                userId,

            updatedBy:
                userId
        });
    };

export const getParties =
    async ({
        businessId,
        type,
        isActive,
        search
    }) => {

        const filter = {
            businessId
        };

        if (type) {
            filter.type =
                type;
        }

        if (
            isActive !==
            undefined
        ) {
            filter.isActive =
                isActive;
        }

        if (search) {
            filter.$or = [
                {
                    name: {
                        $regex:
                            escapeRegex(
                                search
                            ),
                        $options:
                            "i"
                    }
                },
                {
                    email: {
                        $regex:
                            escapeRegex(
                                search
                            ),
                        $options:
                            "i"
                    }
                },
                {
                    phone: {
                        $regex:
                            escapeRegex(
                                search
                            ),
                        $options:
                            "i"
                    }
                },
                {
                    companyName: {
                        $regex:
                            escapeRegex(
                                search
                            ),
                        $options:
                            "i"
                    }
                }
            ];
        }

        return Party.find(
            filter
        )
            .select(
                "_id name type email phone companyName address taxNumber notes isActive createdBy updatedBy createdAt updatedAt"
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
                name: 1
            });
    };

export const getPartyById =
    async ({
        businessId,
        partyId
    }) => {

        const party =
            await Party.findOne({
                _id: partyId,
                businessId
            })
                .select(
                    "_id name type email phone companyName address taxNumber notes isActive createdBy updatedBy createdAt updatedAt"
                )
                .populate(
                    "createdBy",
                    "_id name email"
                )
                .populate(
                    "updatedBy",
                    "_id name email"
                );

        if (!party) {
            throw new AppError(
                "Party not found",
                404,
                "PARTY_NOT_FOUND"
            );
        }

        return party;
    };

export const updateParty =
    async ({
        businessId,
        partyId,
        userId,
        name,
        email,
        phone,
        companyName,
        address,
        taxNumber,
        notes
    }) => {

        const party =
            await Party.findOne({
                _id: partyId,
                businessId
            });

        if (!party) {
            throw new AppError(
                "Party not found",
                404,
                "PARTY_NOT_FOUND"
            );
        }

        if (
            name !==
            undefined
        ) {
            const normalizedName =
                normalizeName(
                    name
                );

            const duplicate =
                await Party.findOne({
                    _id: {
                        $ne:
                            party._id
                    },

                    businessId,

                    type:
                        party.type,

                    name:
                        normalizedName
                });

            if (duplicate) {
                throw new AppError(
                    "A party with this name and type already exists",
                    409,
                    "PARTY_ALREADY_EXISTS"
                );
            }

            party.name =
                normalizedName;
        }

        if (
            email !==
            undefined
        ) {
            party.email =
                email;
        }

        if (
            phone !==
            undefined
        ) {
            party.phone =
                phone;
        }

        if (
            companyName !==
            undefined
        ) {
            party.companyName =
                companyName;
        }

        if (
            address !==
            undefined
        ) {
            party.address =
                address;
        }

        if (
            taxNumber !==
            undefined
        ) {
            party.taxNumber =
                taxNumber;
        }

        if (
            notes !==
            undefined
        ) {
            party.notes =
                notes;
        }

        party.updatedBy =
            userId;

        await party.save();

        return party;
    };

export const updatePartyStatus =
    async ({
        businessId,
        partyId,
        userId,
        isActive
    }) => {

        const party =
            await Party.findOne({
                _id: partyId,
                businessId
            });

        if (!party) {
            throw new AppError(
                "Party not found",
                404,
                "PARTY_NOT_FOUND"
            );
        }

        party.isActive =
            isActive;

        party.updatedBy =
            userId;

        await party.save();

        return party;
    };

const escapeRegex =
    (value) =>
        value.replace(
            /[.*+?^${}()|[\]\\]/g,
            "\\$&"
        );