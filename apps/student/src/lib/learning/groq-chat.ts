import { getGroqApiKey, listGroqChatModelCandidates } from "@/lib/groq-env";

/**
 * Server-side chat completions for learning routes.
 * Returns structured results so callers can avoid silent mock fallbacks when AI is configured.
 *
 * Groq's current default chat model (`openai/gpt-oss-120b`) is a reasoning model:
 * `max_tokens` is deprecated and often ignored, while reasoning consumes the
 * default 1024 `max_completion_tokens` budget — leaving empty/truncated JSON.
 */

const AI_CHAT_URL = "https://api.groq.com/openai/v1/chat/completions";
const DEFAULT_TIMEOUT_MS = 25_000;

export type GroqMessage = { role: "system" | "user" | "assistant"; content: string };

export type GroqChatOptions = {
  maxTokens?: number;
  temperature?: number;
  timeoutMs?: number;
  json?: boolean;
  reasoningEffort?: "low" | "medium" | "high";
  models?: string[];
};

export type GroqChatResult = {
  content: string | null;
  error?: string;
  model?: string;
  status?: number;
};

export function isGroqConfigured(): boolean {
  return Boolean(getGroqApiKey());
}

function modelCandidates(override?: string[]): string[] {
  if (override?.length) return override;
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

function flattenContent(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (Array.isArray(value)) {
    return value
      .map((part) => {
        if (typeof part === "string") return part;
        if (part && typeof part === "object" && "text" in part) {
          return String((part as { text?: unknown }).text ?? "");
        }
        return "";
      })
      .join("")
      .trim();
  }
  return "";
}

export function extractGroqMessageText(message: unknown): string | null {
  if (!message || typeof message !== "object") return null;
  const row = message as Record<string, unknown>;
  const content = flattenContent(row.content);
  if (content) return content;
  const reasoning = flattenContent(row.reasoning);
  return reasoning || null;
}

async function requestChatCompletion(
  key: string,
  model: string,
  messages: GroqMessage[],
  options: GroqChatOptions,
  signal: AbortSignal,
): Promise<GroqChatResult> {
  const body: Record<string, unknown> = {
    model,
    max_completion_tokens: options.maxTokens ?? 700,
    temperature: options.temperature ?? 0.4,
    messages,
    include_reasoning: false,
  };
  if (options.json) {
    body.response_format = { type: "json_object" };
  }
  if (options.reasoningEffort) {
    body.reasoning_effort = options.reasoningEffort;
  }

  const response = await fetch(AI_CHAT_URL, {
    method: "POST",
    signal,
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${key}`,
    },
    body: JSON.stringify(body),
  });

  const rawBody = await response.text();
  if (!response.ok) {
    const detail = rawBody.slice(0, 280).trim();
    const error = detail
      ? `AI request failed (${response.status}): ${detail}`
      : `AI request failed (${response.status}).`;
    return { content: null, error, status: response.status, model };
  }

  let data: { choices?: { message?: unknown }[] };
  try {
    data = JSON.parse(rawBody) as { choices?: { message?: unknown }[] };
  } catch {
    return { content: null, error: "AI returned an unreadable response.", status: response.status, model };
  }

  const text = extractGroqMessageText(data.choices?.[0]?.message);
  if (!text) {
    return { content: null, error: "AI returned an empty response.", status: response.status, model };
  }

  return { content: text, model, status: response.status };
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
    let lastStatus: number | undefined;
    const models = modelCandidates(options.models);
    for (let index = 0; index < models.length; index += 1) {
      const model = models[index]!;
      const result = await requestChatCompletion(key, model, payload, options, controller.signal);
      if (result.content) return result;
      lastError = result.error;
      lastStatus = result.status;
      const authFailure =
        result.error?.includes("(401)") ||
        result.error?.toLowerCase().includes("invalid_api_key");
      if (authFailure) break;
      if (index < models.length - 1) {
        console.warn("[ai-chat] model failed, trying fallback:", model, result.error);
      }
    }

    if (lastError) console.error("[ai-chat]", lastError);
    return { content: null, error: lastError ?? "AI request failed.", status: lastStatus };
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

function recoverJsonText(raw: string): string {
  let s = raw.trim();
  if (s.startsWith("```")) {
    s = s.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "");
  }
  s = s.replace(/[\u201C\u201D]/g, '"').replace(/[\u2018\u2019]/g, "'");
  const first = s.indexOf("{");
  const last = s.lastIndexOf("}");
  if (first < 0 || last <= first) return "";
  return s.slice(first, last + 1);
}

/** Достаёт первый JSON-объект из ответа модели (модель любит добавлять текст вокруг). */
export function extractJsonObject<T>(raw: string | null | undefined): T | null {
  if (!raw) return null;
  const slice = recoverJsonText(raw);
  if (!slice) return null;
  try {
    return JSON.parse(slice) as T;
  } catch {
    try {
      const relaxed = slice.replace(/,\s*([}\]])/g, "$1");
      return JSON.parse(relaxed) as T;
    } catch {
      return null;
    }
  }
}
