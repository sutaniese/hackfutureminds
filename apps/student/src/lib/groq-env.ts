/**
 * Server-only Groq env helpers. Trims whitespace and strips accidental quotes
 * (common when pasting into Vercel or .env files).
 */

/** Groq retired several Llama models in 2026 — map old IDs to current replacements. */
export const DEFAULT_AI_CHAT_MODEL = "openai/gpt-oss-120b";
export const DEFAULT_AI_CHAT_MODEL_FAST = "openai/gpt-oss-20b";

const DEPRECATED_CHAT_MODELS: Record<string, string> = {
  "llama-3.3-70b-versatile": DEFAULT_AI_CHAT_MODEL,
  "llama-3.1-8b-instant": DEFAULT_AI_CHAT_MODEL_FAST,
  "llama3-70b-8192": DEFAULT_AI_CHAT_MODEL,
  "llama3-8b-8192": DEFAULT_AI_CHAT_MODEL_FAST,
  "meta-llama/llama-4-scout-17b-16e-instruct": DEFAULT_AI_CHAT_MODEL,
  "meta-llama/llama-4-maverick-17b-128e-instruct": DEFAULT_AI_CHAT_MODEL,
  "qwen/qwen3-32b": DEFAULT_AI_CHAT_MODEL,
  "moonshotai/kimi-k2-instruct-0905": DEFAULT_AI_CHAT_MODEL,
  "moonshotai/kimi-k2-instruct": DEFAULT_AI_CHAT_MODEL,
  "gemma2-9b-it": DEFAULT_AI_CHAT_MODEL_FAST,
};

function normalizeApiKey(raw: string | undefined): string | undefined {
  if (typeof raw !== "string") return undefined;
  let s = raw.trim();
  if (!s) return undefined;
  if (
    (s.startsWith('"') && s.endsWith('"') && s.length >= 2) ||
    (s.startsWith("'") && s.endsWith("'") && s.length >= 2)
  ) {
    s = s.slice(1, -1).trim();
  }
  if (!s) return undefined;
  if (s.toLowerCase().startsWith("bearer ")) {
    s = s.slice(7).trim();
  }
  if (!s) return undefined;
  const lower = s.toLowerCase();
  if (
    lower.includes("replace-me") ||
    lower === "your_api_key_here" ||
    lower.includes("your_key")
  ) {
    return undefined;
  }
  return s;
}

/** Non-empty Groq secret for server routes; undefined if missing or placeholder. */
export function getGroqApiKey(): string | undefined {
  return normalizeApiKey(process.env.GROQ_API_KEY);
}

export function resolveGroqChatModel(raw?: string | null): string {
  const requested = raw?.trim() || process.env.GROQ_MODEL?.trim();
  if (!requested) return DEFAULT_AI_CHAT_MODEL;
  return DEPRECATED_CHAT_MODELS[requested] ?? requested;
}

export function getGroqChatModel(fallback: string = DEFAULT_AI_CHAT_MODEL): string {
  return resolveGroqChatModel(process.env.GROQ_MODEL?.trim() || fallback);
}

export function getGroqAudioModel(fallback: string): string {
  const m = process.env.GROQ_AUDIO_MODEL?.trim();
  return m && m.length > 0 ? m : fallback;
}

export const DEFAULT_GROQ_STT_MODEL = "whisper-large-v3-turbo";
export const DEFAULT_GROQ_TTS_MODEL = "canopylabs/orpheus-v1-english";
export const DEFAULT_GROQ_TTS_VOICE = "hannah";

export function getGroqTtsModel(): string {
  const m = process.env.GROQ_TTS_MODEL?.trim();
  return m && m.length > 0 ? m : DEFAULT_GROQ_TTS_MODEL;
}

export function listGroqChatModelCandidates(): string[] {
  const preferred = resolveGroqChatModel();
  return [...new Set([preferred, DEFAULT_AI_CHAT_MODEL, DEFAULT_AI_CHAT_MODEL_FAST, "qwen/qwen3.6-27b"])];
}
