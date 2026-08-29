import { z } from "zod";

const objectIdSchema =
    z
        .string()
        .regex(
            /^[a-f\d]{24}$/i,
            "Invalid party ID"
        );

const optionalString =
    (max, field) =>
        z
            .string()
            .trim()
            .max(
                max,
                `${field} cannot exceed ${max} characters`
            )
            .optional();

export const createPartySchema =
    z.object({
        body: z.object({
            name: z
                .string()
                .trim()
                .min(
                    2,
                    "Party name must be at least 2 characters"
                )
                .max(
                    150,
                    "Party name cannot exceed 150 characters"
                ),

            type: z.enum([
                "customer",
                "vendor",
                "customer_vendor"
            ]),

            email: z
                .string()
                .trim()
                .email(
                    "Invalid email address"
                )
                .max(
                    254,
                    "Email cannot exceed 254 characters"
                )
                .optional(),

            phone:
                optionalString(
                    30,
                    "Phone"
                ),

            companyName:
                optionalString(
                    150,
                    "Company name"
                ),

            address:
                optionalString(
                    500,
                    "Address"
                ),

            taxNumber:
                optionalString(
                    100,
                    "Tax number"
                ),

            notes:
                optionalString(
                    1000,
                    "Notes"
                )
        })
    });

export const listPartySchema =
    z.object({
        query: z.object({
            type: z
                .enum([
                    "customer",
                    "vendor",
                    "customer_vendor"
                ])
                .optional(),

            isActive: z
                .enum([
                    "true",
                    "false"
                ])
                .transform(
                    (value) =>
                        value === "true"
                )
                .optional(),

            search: z
                .string()
                .trim()
                .max(
                    100,
                    "Search cannot exceed 100 characters"
                )
                .optional()
        })
    });

export const partyIdSchema =
    z.object({
        params: z.object({
            id:
                objectIdSchema
        })
    });

export const updatePartySchema =
    z.object({
        params: z.object({
            id:
                objectIdSchema
        }),

        body: z.object({
            name: z
                .string()
                .trim()
                .min(
                    2,
                    "Party name must be at least 2 characters"
                )
                .max(
                    150,
                    "Party name cannot exceed 150 characters"
                )
                .optional(),

            email: z
                .string()
                .trim()
                .email(
                    "Invalid email address"
                )
                .max(254)
                .nullable()
                .optional(),

            phone:
                optionalString(
                    30,
                    "Phone"
                ).nullable(),

            companyName:
                optionalString(
                    150,
                    "Company name"
                ).nullable(),

            address:
                optionalString(
                    500,
                    "Address"
                ).nullable(),

            taxNumber:
                optionalString(
                    100,
                    "Tax number"
                ).nullable(),

            notes:
                optionalString(
                    1000,
                    "Notes"
                ).nullable()
        })
    });

export const updatePartyStatusSchema =
    z.object({
        params: z.object({
            id:
                objectIdSchema
        }),

        body: z.object({
            isActive:
                z.boolean()
        })
    });