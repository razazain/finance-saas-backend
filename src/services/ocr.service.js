import { env } from "../config/env.js";
import { AppError } from "../utils/appError.js";
import { parseOcrText } from "../utils/documentParser.js";

export const processDocumentWithOcr = async ({ document }) => {
  if (!env.OCR_SERVICE_URL) {
    throw new AppError(
      "OCR service is not configured",
      503,
      "OCR_SERVICE_NOT_CONFIGURED",
    );
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), env.OCR_TIMEOUT_MS);

  try {
    const response = await fetch(`${env.OCR_SERVICE_URL}/ocr`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: document.cloudinary.secureUrl,
        mimeType: document.mimeType,
        fileName: document.originalFileName,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const body = await response.text();
      throw new AppError(
        `OCR service failed: ${body.slice(0, 500)}`,
        502,
        "OCR_SERVICE_ERROR",
      );
    }

    const result = await response.json();
    const rawText = result.text || "";

    return {
      provider: "paddleocr",
      rawText,
      extracted: parseOcrText(rawText),
      pages: result.pages || [],
      processedAt: new Date().toISOString(),
    };
  } catch (error) {
    if (error instanceof AppError) throw error;
    if (error.name === "AbortError") {
      throw new AppError("OCR service timed out", 504, "OCR_SERVICE_TIMEOUT");
    }
    throw new AppError(
      "Unable to reach OCR service",
      502,
      "OCR_SERVICE_UNAVAILABLE",
    );
  } finally {
    clearTimeout(timeout);
  }
};
