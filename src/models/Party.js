import mongoose from "mongoose";

const partySchema =
    new mongoose.Schema(
        {
            businessId: {
                type:
                    mongoose.Schema.Types.ObjectId,
                ref: "Business",
                required: true,
                index: true
            },

            name: {
                type: String,
                required: true,
                trim: true,
                minlength: 2,
                maxlength: 150
            },

            type: {
                type: String,
                enum: [
                    "customer",
                    "vendor",
                    "customer_vendor"
                ],
                required: true
            },

            email: {
                type: String,
                trim: true,
                lowercase: true,
                maxlength: 254,
                default: null
            },

            phone: {
                type: String,
                trim: true,
                maxlength: 30,
                default: null
            },

            companyName: {
                type: String,
                trim: true,
                maxlength: 150,
                default: null
            },

            address: {
                type: String,
                trim: true,
                maxlength: 500,
                default: null
            },

            taxNumber: {
                type: String,
                trim: true,
                maxlength: 100,
                default: null
            },

            notes: {
                type: String,
                trim: true,
                maxlength: 1000,
                default: null
            },

            isActive: {
                type: Boolean,
                default: true
            },

            createdBy: {
                type:
                    mongoose.Schema.Types.ObjectId,
                ref: "User",
                required: true
            },

            updatedBy: {
                type:
                    mongoose.Schema.Types.ObjectId,
                ref: "User",
                required: true
            }
        },
        {
            timestamps: true
        }
    );

/*
 * A business cannot have two parties
 * with the exact same name and type.
 */
partySchema.index(
    {
        businessId: 1,
        type: 1,
        name: 1
    },
    {
        unique: true
    }
);

/*
 * Useful for listing/filtering parties.
 */
partySchema.index({
    businessId: 1,
    type: 1,
    isActive: 1
});

/*
 * Useful for searching by email.
 */
partySchema.index({
    businessId: 1,
    email: 1
});

const Party =
    mongoose.model(
        "Party",
        partySchema
    );

export default Party;