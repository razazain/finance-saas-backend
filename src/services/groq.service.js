import { env } from "../config/env.js";
import { AppError } from "../utils/appError.js";

const endpoint = () =>
  `${env.GROQ_BASE_URL.replace(/\/+$/, "")}/chat/completions`;

export const isGroqEnabled = () => Boolean(env.GROQ_API_KEY?.trim());

const ensureGroqEnabled = () => {
  if (!isGroqEnabled()) {
    throw new AppError(
      "Groq AI is not configured. Add GROQ_API_KEY to the backend environment.",
      503,
      "AI_NOT_CONFIGURED",
    );
  }
};

/**
 * Minimal Groq Chat Completions client using Node's native fetch.
 * We intentionally avoid an SDK dependency and never log prompts or API keys.
 */
export const groqChat = async ({
  messages,
  temperature = 0.2,
  maxTokens = 1200,
  jsonMode = false,
}) => {
  ensureGroqEnabled();

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), env.GROQ_TIMEOUT_MS);

  try {
    const response = await fetch(endpoint(), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.GROQ_API_KEY.trim()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: env.GROQ_MODEL,
        messages,
        temperature,
        max_completion_tokens: maxTokens,
        ...(jsonMode ? { response_format: { type: "json_object" } } : {}),
      }),
      signal: controller.signal,
    });

    if (response.status === 401 || response.status === 403) {
      throw new AppError(
        "Groq rejected the configured API key. Verify GROQ_API_KEY.",
        503,
        "AI_PROVIDER_AUTH_FAILED",
      );
    }

    if (response.status === 429) {
      const retryAfter = response.headers.get("retry-after");
      throw new AppError(
        "Groq rate limit reached. Please retry after the provider limit resets.",
        429,
        "AI_RATE_LIMITED",
        retryAfter ? { retryAfter } : null,
      );
    }

    if (!response.ok) {
      // Avoid forwarding provider response bodies because they may contain
      // implementation details or echoed prompt fragments.
      throw new AppError(
        response.status >= 500
          ? "Groq is temporarily unavailable. Please retry shortly."
          : "Groq could not process this request. Check the configured model and request limits.",
        502,
        "AI_PROVIDER_ERROR",
      );
    }

    const payload = await response.json();
    const content = payload?.choices?.[0]?.message?.content;
    if (typeof content !== "string" || !content.trim()) {
      throw new AppError(
        "Groq returned an empty response.",
        502,
        "AI_EMPTY_RESPONSE",
      );
    }

    return {
      content: content.trim(),
      model: payload.model || env.GROQ_MODEL,
      usage: payload.usage || null,
      id: payload.id || null,
    };
  } catch (error) {
    if (error instanceof AppError) throw error;
    if (error?.name === "AbortError") {
      throw new AppError(
        "Groq request timed out. Please retry with a shorter request.",
        504,
        "AI_PROVIDER_TIMEOUT",
      );
    }
    throw new AppError(
      "Unable to reach Groq. Check the server network and Groq service status.",
      502,
      "AI_PROVIDER_UNAVAILABLE",
    );
  } finally {
    clearTimeout(timeout);
  }
};

export const groqJson = async (options) => {
  const result = await groqChat({ ...options, jsonMode: true });
  let parsed;
  try {
    // Some models may still wrap JSON in a Markdown fence despite JSON mode.
    const cleaned = result.content
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/, "");
    parsed = JSON.parse(cleaned);
  } catch {
    throw new AppError(
      "AI returned a response that could not be read as JSON. Please retry.",
      502,
      "AI_INVALID_JSON",
    );
  }
  return { data: parsed, model: result.model, usage: result.usage, id: result.id };
};
