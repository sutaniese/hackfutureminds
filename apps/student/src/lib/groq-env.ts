/**
 * Server-only Groq env helpers. Trims whitespace and strips accidental quotes
 * (common when pasting into Vercel or .env files).
 */

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

export function getGroqChatModel(fallback: string): string {
  const m = process.env.GROQ_MODEL?.trim();
  return m && m.length > 0 ? m : fallback;
}

export function getGroqAudioModel(fallback: string): string {
  const m = process.env.GROQ_AUDIO_MODEL?.trim();
  return m && m.length > 0 ? m : fallback;
}
