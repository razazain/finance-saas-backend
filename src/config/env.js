import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),

  PORT: z.coerce.number().int().positive().default(5000),

  MONGO_URI: z.string().min(1, "MONGO_URI is required"),

  CLIENT_URL: z.string().min(1, "CLIENT_URL is required"),

  JWT_ACCESS_SECRET: z
    .string()
    .min(32, "JWT_ACCESS_SECRET must be at least 32 characters"),

  JWT_REFRESH_SECRET: z
    .string()
    .min(32, "JWT_REFRESH_SECRET must be at least 32 characters"),

  JWT_ACCESS_EXPIRES_IN: z.string().default("15m"),

  JWT_REFRESH_EXPIRES_IN: z.string().default("7d"),

  CLOUDINARY_API_KEY: z.string().min(1),
  CLOUDINARY_API_SECRET: z.string().min(1),
  CLOUDINARY_CLOUD_NAME: z.string().min(1),

  OCR_SERVICE_URL: z.string().url().default("http://127.0.0.1:8001"),
  OCR_TIMEOUT_MS: z.coerce
    .number()
    .int()
    .positive()
    .max(300000)
    .default(120000),
  RECURRING_WORKER_ENABLED: z.preprocess((value) => {
    if (typeof value === "boolean") return value;
    if (value === undefined) return true;
    return String(value).toLowerCase() === "true";
  }, z.boolean()),
  RECURRING_WORKER_INTERVAL_MS: z.coerce
    .number()
    .int()
    .min(10000)
    .max(3600000)
    .default(60000),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error("❌ Invalid environment configuration:");

  console.error(parsedEnv.error.flatten().fieldErrors);

  process.exit(1);
}

export const env = parsedEnv.data;
