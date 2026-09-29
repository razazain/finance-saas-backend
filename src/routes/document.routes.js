import express from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/authorize.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import {
  initDocumentUploadSchema,
  completeDocumentUploadSchema,
  documentIdSchema,
  listDocumentSchema,
  convertDocumentSchema,
} from "../validators/document.validator.js";
import {
  initUpload,
  completeUpload,
  list,
  getOne,
  process,
  convert,
  remove,
} from "../controllers/document.controller.js";

const router = express.Router();
const staff = ["owner", "admin", "employee"];

router.post(
  "/upload/init",
  authenticate,
  authorize(...staff),
  validate(initDocumentUploadSchema),
  initUpload,
);
router.post(
  "/:id/upload/complete",
  authenticate,
  authorize(...staff),
  validate(completeDocumentUploadSchema),
  completeUpload,
);
router.get(
  "/",
  authenticate,
  authorize(...staff),
  validate(listDocumentSchema),
  list,
);
router.get(
  "/:id",
  authenticate,
  authorize(...staff),
  validate(documentIdSchema),
  getOne,
);
router.post(
  "/:id/process",
  authenticate,
  authorize(...staff),
  validate(documentIdSchema),
  process,
);
router.post(
  "/:id/convert",
  authenticate,
  authorize("owner", "admin"),
  validate(convertDocumentSchema),
  convert,
);
router.delete(
  "/:id",
  authenticate,
  authorize("owner", "admin"),
  validate(documentIdSchema),
  remove,
);

export default router;
