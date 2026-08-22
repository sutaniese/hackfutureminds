/** True when `readJsonResponse` (or similar) would classify the body as an HTML error envelope. */
export function looksLikeHttpHtmlFailureMessage(message: string): boolean {
  const u = message.toLowerCase();
  return (
    u.includes("<!doctype") ||
    u.includes("unexpected token") ||
    u.includes("not valid json") ||
    u.includes("instead of json") ||
    u.includes("response was html") ||
    (u.includes("html") && u.includes("not json")) ||
    (u.includes("request failed") && /\b(4\d\d|5\d\d)\b/.test(u))
  );
}

export async function readJsonResponse<T>(res: Response): Promise<T | { error: string }> {
  const text = await res.text();
  if (!text) return {} as T;

  const trimmed = text.trim();
  if (trimmed.startsWith("<")) {
    return {
      error: res.ok
        ? "Server returned HTML instead of JSON."
        : `Request failed (${res.status}). Response was HTML, not JSON.`,
    };
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    return {
      error: res.ok
        ? "API returned an invalid JSON response"
        : `API returned ${res.status} ${res.statusText || "error"} instead of JSON`,
    };
  }
}
