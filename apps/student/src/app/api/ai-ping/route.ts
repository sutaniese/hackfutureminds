import { NextResponse } from "next/server";
import { getGroqApiKey, resolveGroqChatModel } from "@/lib/groq-env";
import { groqChat } from "@/lib/learning/groq-chat";
import { userFacingAiError } from "@/lib/learning/ai-error-hint";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * Live Groq connectivity check. `/api/health` only proves the key is present;
 * this route makes a tiny completion and returns the provider error when it fails.
 */
export async function GET() {
  const configured = Boolean(getGroqApiKey());
  if (!configured) {
    return NextResponse.json({
      configured: false,
      ok: false,
      model: null,
      hint: "Добавьте GROQ_API_KEY в apps/student/.env.local (локально) или в Vercel → Environment Variables.",
    });
  }

  const model = resolveGroqChatModel();
  const { content, error } = await groqChat(
    [{ role: "user", content: "Reply with exactly: OK" }],
    { maxTokens: 8, temperature: 0 },
  );

  return NextResponse.json({
    configured: true,
    ok: Boolean(content),
    model,
    sample: content?.slice(0, 40) ?? null,
    error: error ?? null,
    hint: content ? "AI отвечает. Если репетитор всё ещё падает — обновите страницу и попробуйте снова." : userFacingAiError(error),
  });
}
