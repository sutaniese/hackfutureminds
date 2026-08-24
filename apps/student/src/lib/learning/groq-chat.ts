import { getGroqApiKey, getGroqChatModel } from "@/lib/groq-env";

/**
 * Server-side chat completions for learning routes.
 * Returns structured results so callers can avoid silent mock fallbacks when AI is configured.
 */

const AI_CHAT_URL = "https://api.groq.com/openai/v1/chat/completions";
const DEFAULT_TIMEOUT_MS = 25_000;

export type GroqMessage = { role: "system" | "user" | "assistant"; content: string };

export type GroqChatOptions = {
  maxTokens?: number;
  temperature?: number;
  timeoutMs?: number;
};

export type GroqChatResult = {
  content: string | null;
  error?: string;
};

export function isGroqConfigured(): boolean {
  return Boolean(getGroqApiKey());
}

export async function groqChat(
  messages: GroqMessage[],
  options: GroqChatOptions = {},
): Promise<GroqChatResult> {
  const key = getGroqApiKey();
  if (!key) {
    return { content: null, error: "AI is not configured on the server." };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? DEFAULT_TIMEOUT_MS);

  try {
    const response = await fetch(AI_CHAT_URL, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: getGroqChatModel("llama-3.3-70b-versatile"),
        max_tokens: options.maxTokens ?? 700,
        temperature: options.temperature ?? 0.4,
        messages,
      }),
    });

    const rawBody = await response.text();
    if (!response.ok) {
      const detail = rawBody.slice(0, 280).trim();
      const error = detail
        ? `AI request failed (${response.status}): ${detail}`
        : `AI request failed (${response.status}).`;
      console.error("[ai-chat]", error);
      return { content: null, error };
    }

    let data: { choices?: { message?: { content?: string } }[] };
    try {
      data = JSON.parse(rawBody) as { choices?: { message?: { content?: string } }[] };
    } catch {
      console.error("[ai-chat] Non-JSON response:", rawBody.slice(0, 280));
      return { content: null, error: "AI returned an unreadable response." };
    }

    const text = data.choices?.[0]?.message?.content?.trim();
    if (!text) {
      return { content: null, error: "AI returned an empty response." };
    }

    return { content: text };
  } catch (error) {
    const message =
      error instanceof Error && error.name === "AbortError"
        ? "AI request timed out."
        : error instanceof Error
          ? error.message
          : "AI request failed.";
    console.error("[ai-chat]", message);
    return { content: null, error: message };
  } finally {
    clearTimeout(timer);
  }
}

/** Достаёт первый JSON-объект из ответа модели (модель любит добавлять текст вокруг). */
export function extractJsonObject<T>(raw: string | null | undefined): T | null {
  if (!raw) return null;
  const first = raw.indexOf("{");
  const last = raw.lastIndexOf("}");
  if (first < 0 || last <= first) return null;
  try {
    return JSON.parse(raw.slice(first, last + 1)) as T;
  } catch {
    return null;
  }
}
