const AI_UNAVAILABLE =
  "AI-репетитор сейчас недоступен. Попробуйте позже или откройте конспект темы ниже.";

const COACH_UNAVAILABLE =
  "AI-наставник сейчас недоступен. Попробуйте позже или проверьте GROQ_API_KEY на сервере.";

export { COACH_UNAVAILABLE };

/** Map provider errors to short Russian hints for students/admins. */
export function userFacingAiError(error?: string, unavailableMessage = AI_UNAVAILABLE): string {
  if (!error) return unavailableMessage;

  const lower = error.toLowerCase();

  if (lower.includes("invalid_api_key") || lower.includes("(401)")) {
    return "Ключ AI недействителен. Создайте новый на console.groq.com, обновите GROQ_API_KEY и перезапустите сервер или сделайте redeploy на Vercel.";
  }

  if (
    lower.includes("model") &&
    (lower.includes("(404)") || lower.includes("not found") || lower.includes("decommission"))
  ) {
    return "Модель AI не найдена. Удалите GROQ_MODEL или установите: openai/gpt-oss-120b";
  }

  if (lower.includes("(429)") || lower.includes("rate limit") || lower.includes("rate_limit")) {
    return "Превышен лимит запросов AI. Подождите минуту и попробуйте снова.";
  }

  if (lower.includes("timed out") || lower.includes("timeout")) {
    return "AI не успел ответить вовремя. Попробуйте короче вопрос или проверьте лимиты функции на Vercel.";
  }

  return unavailableMessage;
}
