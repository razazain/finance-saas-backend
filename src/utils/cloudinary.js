import crypto from "crypto";
import { env } from "../config/env.js";

const cloudinaryBase = `https://api.cloudinary.com/v1_1/${env.CLOUDINARY_CLOUD_NAME}`;

const signParams = (params) => {
  const canonical = Object.entries(params)
    .filter(
      ([, value]) => value !== undefined && value !== null && value !== "",
    )
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");

  return crypto
    .createHash("sha1")
    .update(`${canonical}${env.CLOUDINARY_API_SECRET}`)
    .digest("hex");
};

export const createDocumentUploadSignature = ({ businessId, documentId }) => {
  const timestamp = Math.floor(Date.now() / 1000);
  const folder = `financeSaaS/businesses/${businessId}/documents/${documentId}`;
  const publicId = documentId.toString();

  const signature = signParams({
    folder,
    public_id: publicId,
    timestamp,
  });

  return {
    cloudName: env.CLOUDINARY_CLOUD_NAME,
    apiKey: env.CLOUDINARY_API_KEY,
    timestamp,
    signature,
    folder,
    publicId,
    uploadUrl: `${cloudinaryBase}/auto/upload`,
  };
};

export const destroyCloudinaryAsset = async ({
  publicId,
  resourceType = "image",
}) => {
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = signParams({ public_id: publicId, timestamp });
  const endpoint = `${cloudinaryBase}/${resourceType}/destroy`;

  const body = new URLSearchParams({
    public_id: publicId,
    timestamp: String(timestamp),
    api_key: env.CLOUDINARY_API_KEY,
    signature,
  });

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!response.ok) {
    throw new Error(`Cloudinary destroy failed with status ${response.status}`);
  }

  return response.json();
};

export const isValidDocumentAsset = ({
  businessId,
  documentId,
  publicId,
  secureUrl,
}) => {
  const expectedPrefix = `financeSaaS/businesses/${businessId}/documents/${documentId}`;
  const validPublicId =
    publicId === `${expectedPrefix}/${documentId}` ||
    publicId === `${expectedPrefix}`;
  const validHost = new RegExp(
    `^https://res\\.cloudinary\\.com/${env.CLOUDINARY_CLOUD_NAME}/`,
  ).test(secureUrl || "");
  return validPublicId && validHost;
};
