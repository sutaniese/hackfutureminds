import { getGroqApiKey, listGroqChatModelCandidates } from "@/lib/groq-env";

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

function modelCandidates(): string[] {
  return listGroqChatModelCandidates();
}

/** Groq accepts only one leading system message and alternating user/assistant turns. */
export function normalizeGroqMessages(messages: GroqMessage[]): GroqMessage[] {
  const systemParts: string[] = [];
  const conversation: GroqMessage[] = [];

  for (const message of messages) {
    const content = message.content.trim();
    if (!content) continue;
    if (message.role === "system") {
      systemParts.push(content);
      continue;
    }
    conversation.push({ role: message.role, content });
  }

  const normalized: GroqMessage[] = [];
  if (systemParts.length > 0) {
    normalized.push({ role: "system", content: systemParts.join("\n\n") });
  }

  for (const message of conversation) {
    const last = normalized[normalized.length - 1];
    if (last && last.role === message.role) {
      last.content = `${last.content}\n\n${message.content}`;
      continue;
    }
    normalized.push(message);
  }

  const firstDialog = normalized.find((message) => message.role !== "system");
  if (firstDialog?.role === "assistant") {
    const index = normalized.findIndex((message) => message.role === "assistant");
    normalized.splice(index, 0, { role: "user", content: "Продолжим разбор темы." });
  }

  return normalized;
}

async function requestChatCompletion(
  key: string,
  model: string,
  messages: GroqMessage[],
  options: GroqChatOptions,
  signal: AbortSignal,
): Promise<GroqChatResult> {
  const response = await fetch(AI_CHAT_URL, {
    method: "POST",
    signal,
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model,
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
    return { content: null, error };
  }

  let data: { choices?: { message?: { content?: string } }[] };
  try {
    data = JSON.parse(rawBody) as { choices?: { message?: { content?: string } }[] };
  } catch {
    return { content: null, error: "AI returned an unreadable response." };
  }

  const text = data.choices?.[0]?.message?.content?.trim();
  if (!text) {
    return { content: null, error: "AI returned an empty response." };
  }

  return { content: text };
}

export async function groqChat(
  messages: GroqMessage[],
  options: GroqChatOptions = {},
): Promise<GroqChatResult> {
  const key = getGroqApiKey();
  if (!key) {
    return { content: null, error: "AI is not configured on the server." };
  }

  const payload = normalizeGroqMessages(messages);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? DEFAULT_TIMEOUT_MS);

  try {
    let lastError: string | undefined;
    const models = modelCandidates();
    for (let index = 0; index < models.length; index += 1) {
      const model = models[index]!;
      const result = await requestChatCompletion(key, model, payload, options, controller.signal);
      if (result.content) return result;
      lastError = result.error;
      const authFailure =
        result.error?.includes("(401)") ||
        result.error?.toLowerCase().includes("invalid_api_key");
      if (authFailure) break;
      if (index < models.length - 1) {
        console.warn("[ai-chat] model failed, trying fallback:", model, result.error);
      }
    }

    if (lastError) console.error("[ai-chat]", lastError);
    return { content: null, error: lastError ?? "AI request failed." };
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
