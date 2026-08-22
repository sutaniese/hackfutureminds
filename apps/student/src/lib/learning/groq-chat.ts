import { getGroqApiKey, getGroqChatModel } from "@/lib/groq-env";

/**
 * Тонкая обёртка над Groq chat completions для учебных маршрутов.
 * Никогда не бросает исключение: при отсутствии ключа, таймауте или
 * ошибке сети возвращает null, и вызывающий код уходит в детерминированный
 * fallback. Демонстрация обязана работать без ключа.
 */

const GROQ_CHAT_URL = "https://api.groq.com/openai/v1/chat/completions";
const DEFAULT_TIMEOUT_MS = 12_000;

export type GroqMessage = { role: "system" | "user" | "assistant"; content: string };

export type GroqChatOptions = {
  maxTokens?: number;
  temperature?: number;
  timeoutMs?: number;
};

export function isGroqConfigured(): boolean {
  return Boolean(getGroqApiKey());
}

export async function groqChat(
  messages: GroqMessage[],
  options: GroqChatOptions = {},
): Promise<string | null> {
  const key = getGroqApiKey();
  if (!key) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? DEFAULT_TIMEOUT_MS);

  try {
    const response = await fetch(GROQ_CHAT_URL, {
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

    if (!response.ok) return null;

    const data = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const text = data.choices?.[0]?.message?.content?.trim();
    return text && text.length > 0 ? text : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Достаёт первый JSON-объект из ответа модели (модель любит добавлять текст вокруг). */
export function extractJsonObject<T>(raw: string | null): T | null {
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
