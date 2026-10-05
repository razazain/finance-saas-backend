import IdempotencyKey from "../models/IdempotencyKey.js";
import { env } from "../config/env.js";
import { AppError } from "../utils/appError.js";
export const idempotency = async (req, res, next) => {
  const key = req.get("Idempotency-Key");
  if (!key) return next();
  if (key.length < 8 || key.length > 200)
    throw new AppError(
      "Idempotency-Key must be 8-200 characters",
      400,
      "INVALID_IDEMPOTENCY_KEY",
    );
  if (!req.user) return next();
  const expiresAt = new Date(Date.now() + env.IDEMPOTENCY_TTL_HOURS * 3600000);
  try {
    const doc = await IdempotencyKey.create({
      businessId: req.user.businessId,
      userId: req.user.userId,
      key,
      method: req.method,
      path: req.path,
      expiresAt,
    });
    let body;
    const original = res.json.bind(res);
    res.json = (payload) => {
      body = payload;
      return original(payload);
    };
    res.on("finish", async () => {
      if (res.statusCode < 500)
        await IdempotencyKey.updateOne(
          { _id: doc._id },
          {
            $set: {
              status: "completed",
              statusCode: res.statusCode,
              responseBody: body,
            },
          },
        ).catch(() => {});
      else await IdempotencyKey.deleteOne({ _id: doc._id }).catch(() => {});
    });
    return next();
  } catch (error) {
    if (error?.code !== 11000) throw error;
    const existing = await IdempotencyKey.findOne({
      businessId: req.user.businessId,
      userId: req.user.userId,
      key,
      method: req.method,
      path: req.path,
    });
    if (existing?.status === "completed")
      return res.status(existing.statusCode || 200).json(existing.responseBody);
    throw new AppError(
      "A request with this Idempotency-Key is already processing",
      409,
      "IDEMPOTENCY_IN_PROGRESS",
    );
  }
};
