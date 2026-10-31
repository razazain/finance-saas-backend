import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),

  PORT: z.coerce.number().int().positive().default(5000),

  MONGO_URI: z.string().min(1, "MONGO_URI is required"),

  // Groq is optional so the existing non-AI API can run without a key.
  GROQ_API_KEY: z.string().default(""),
  GROQ_MODEL: z.string().trim().min(1).default("openai/gpt-oss-20b"),
  GROQ_BASE_URL: z.string().url().default("https://api.groq.com/openai/v1"),
  GROQ_TIMEOUT_MS: z.coerce.number().int().min(5000).max(120000).default(45000),
  GROQ_DOCUMENT_EXTRACTION_ENABLED: z.preprocess((value) => {
    if (value === undefined) return true;
    if (typeof value === "boolean") return value;
    return String(value).toLowerCase() === "true";
  }, z.boolean()),

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
  SMTP_ENABLED: z.preprocess(
    (v) => String(v || "false").toLowerCase() === "true",
    z.boolean(),
  ),
  SMTP_HOST: z.string().default(""),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_SECURE: z.preprocess(
    (v) => String(v || "false").toLowerCase() === "true",
    z.boolean(),
  ),
  SMTP_USER: z.string().default(""),
  SMTP_PASSWORD: z.string().default(""),
  SMTP_FROM_EMAIL: z.string().email().default("no-reply@example.com"),
  SMTP_FROM_NAME: z.string().default("Finance SaaS"),
  EMAIL_VERIFICATION_REQUIRED: z.preprocess(
    (v) => String(v || "false").toLowerCase() === "true",
    z.boolean(),
  ),
  EMAIL_VERIFICATION_EXPIRES_MINUTES: z.coerce
    .number()
    .int()
    .positive()
    .default(30),
  PASSWORD_RESET_EXPIRES_MINUTES: z.coerce
    .number()
    .int()
    .positive()
    .default(30),
  MFA_ISSUER: z.string().default("Finance SaaS"),
  IDEMPOTENCY_TTL_HOURS: z.coerce.number().int().positive().default(24),
  AUDIT_LOG_ENABLED: z.preprocess(
    (v) => String(v || "true").toLowerCase() !== "false",
    z.boolean(),
  ),
  DOCUMENT_PRIVATE_ACCESS: z.preprocess(
    (v) => String(v || "true").toLowerCase() !== "false",
    z.boolean(),
  ),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error("❌ Invalid environment configuration:");

  console.error(parsedEnv.error.flatten().fieldErrors);

  process.exit(1);
}

export const env = parsedEnv.data;
