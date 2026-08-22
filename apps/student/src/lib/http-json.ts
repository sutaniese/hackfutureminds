export async function readJsonResponse<T>(res: Response): Promise<T | { error: string }> {
  const text = await res.text();
  if (!text) return {} as T;

  const trimmed = text.trim();
  if (trimmed.startsWith("<")) {
    return {
      error: res.ok
        ? "Server returned an HTML page instead of JSON (the API route may have crashed)."
        : `Request failed (${res.status}). The server returned an HTML error page instead of JSON—check deployment logs and that this API route is included in the build.`,
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
