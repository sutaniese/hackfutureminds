/** API bodies are not guaranteed to be `{ students: [] }` — never call `.length` on a maybe-array. */
export function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? value : [];
}
