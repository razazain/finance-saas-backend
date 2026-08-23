import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";
import { env } from "./config/env.js";

import authRoutes from "./routes/auth.routes.js";
import businessRoutes from "./routes/business.routes.js";
import userRoutes from "./routes/user.routes.js";

import { errorMiddleware } from "./middleware/error.middleware.js";

const app = express();
app.use(cookieParser());

/*
 * Security headers
 */
app.use(
  helmet()
);

/*
 * CORS
 */
app.use(
  cors({
    origin: env.CLIENT_URL,
    credentials: true
  })
);

/*
 * General rate limiting
 */
const generalLimiter =
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 200,
    standardHeaders: "draft-8",
    legacyHeaders: false,

    message: {
      success: false,
      code: "RATE_LIMIT_EXCEEDED",
      message:
        "Too many requests. Please try again later."
    }
  });

app.use(
  generalLimiter
);

/*
 * Body size limits
 *
 * We intentionally keep these small.
 * File uploads will use a dedicated
 * upload mechanism later.
 */
app.use(
  express.json({
    limit: "100kb"
  })
);

app.use(
  express.urlencoded({
    extended: false,
    limit: "100kb"
  })
);

/*
 * Health check
 */
app.get(
  "/health",
  (req, res) => {
    res.status(200).json({
      success: true,
      message: "Finance SaaS API is healthy",
      environment: env.NODE_ENV
    });
  }
);

/*
 * API routes
 */
app.use(
  "/api/v1/auth",
  authRoutes
);

app.use(
  "/api/v1/businesses",
  businessRoutes
);

app.use(
  "/api/v1/users",
  userRoutes
);

/*
 * 404 handler
 */
app.use(
  (req, res) => {
    res.status(404).json({
      success: false,
      code: "ROUTE_NOT_FOUND",
      message: `Route ${req.method} ${req.originalUrl} not found`
    });
  }
);

/*
 * Global error handler
 *
 * This must be registered after
 * all routes.
 */
app.use(
  errorMiddleware
);

export default app;