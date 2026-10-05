import AuditLog from "../models/AuditLog.js";
import { env } from "../config/env.js";
export const auditRequest = (req, res, next) => {
  if (!env.AUDIT_LOG_ENABLED) return next();
  res.on("finish", () => {
    if (!req.user || req.method === "GET" || req.method === "HEAD") return;
    AuditLog.create({
      businessId: req.user.businessId,
      userId: req.user.userId,
      action: `${req.method} ${req.route?.path || req.path}`,
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      ip: req.ip,
      userAgent: req.get("user-agent"),
    }).catch(() => {});
  });
  next();
};
