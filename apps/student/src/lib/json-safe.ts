/**
 * Clone via JSON so NextResponse.json never hits BigInt / non-JSON values from upstream APIs.
 */
export function jsonSafeClone<T>(value: T): T {
  try {
    return JSON.parse(
      JSON.stringify(value as unknown, (_key, v) =>
        typeof v === "bigint" ? v.toString() : v,
      ),
    ) as T;
  } catch {
    throw new Error("Could not serialize value for JSON.");
  }
}
