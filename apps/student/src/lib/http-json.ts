export async function readJsonResponse<T>(res: Response): Promise<T | { error: string }> {
  const text = await res.text();
  if (!text) return {} as T;

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
