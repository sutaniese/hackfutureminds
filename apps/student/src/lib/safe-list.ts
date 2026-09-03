/** API bodies are not guaranteed to be `{ students: [] }` — never call `.length` on a maybe-array. */
export function asArray<T>(value: T[] | null | undefined): T[];
export function asArray<T = unknown>(value: unknown): T[];
export function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}
