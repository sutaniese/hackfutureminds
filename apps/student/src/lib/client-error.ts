const INTERNAL = /accessToken option|getClaims is not possible|@supabase\/supabase-js|AuthApiError|JWS|JWKS/i;

/** Never show a raw supabase-js / stack string in the join or class UI. */
export function humanClientError(err: unknown, fallback: string): string {
  const msg = err instanceof Error ? err.message : typeof err === "string" ? err : "";
  if (!msg || INTERNAL.test(msg) || msg.length > 160) return fallback;
  return msg;
}
