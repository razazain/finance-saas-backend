import { z } from "zod";

const objectIdSchema =
  z
    .string()
    .regex(
      /^[a-f\d]{24}$/i,
      "Invalid ID"
    );

const dateSchema =
  z
    .string()
    .datetime({
      offset: true
    });

/*
 * Ledger query parameters.
 *
 * from / to are optional.
 * If omitted, the complete party
 * history is returned.
 */
export const partyLedgerSchema =
  z.object({
    params: z.object({
      id:
        objectIdSchema
    }),

    query: z.object({
      from:
        dateSchema.optional(),

      to:
        dateSchema.optional(),

      page:
        z
          .string()
          .regex(
            /^\d+$/,
            "Page must be a positive number"
          )
          .transform(Number)
          .refine(
            (value) =>
              value >= 1,
            {
              message:
                "Page must be at least 1"
            }
          )
          .optional(),

      limit:
        z
          .string()
          .regex(
            /^\d+$/,
            "Limit must be a positive number"
          )
          .transform(Number)
          .refine(
            (value) =>
              value >= 1 &&
              value <= 100,
            {
              message:
                "Limit must be between 1 and 100"
            }
          )
          .optional()
    })
  });