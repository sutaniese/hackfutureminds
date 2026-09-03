const INTERNAL_AUTH =
  /accessToken option|getClaims is not possible|@supabase\/supabase-js|AuthApiError|JWS|jwt|JWKS|invalid claim/i;

export function publicErrorMessage(err: unknown, fallback: string): string {
  const msg = err instanceof Error ? err.message : typeof err === "string" ? err : "";
  if (!msg || INTERNAL_AUTH.test(msg)) return fallback;
  if (msg.length > 160) return fallback;
  return msg;
}

export function joinFailureMessage(raw: string): { status: number; message: string } {
  const msg = raw.toLowerCase();
  if (msg.includes("class not found") || msg.includes("не найден") || msg.includes("invalid")) {
    return { status: 404, message: "Неверный код класса." };
  }
  if (msg.includes("already") || msg.includes("duplicate") || msg.includes("conflict") || msg.includes("уже в")) {
    return { status: 409, message: "Вы уже в этом классе." };
  }
  if (
    msg.includes("not authenticated") ||
    msg.includes("not signed") ||
    INTERNAL_AUTH.test(raw)
  ) {
    return { status: 401, message: "Войдите в аккаунт." };
  }
  if (msg.includes("only students")) {
    return { status: 403, message: "Вступить в класс могут только ученики." };
  }
  return { status: 400, message: "Не удалось вступить в класс." };
}
