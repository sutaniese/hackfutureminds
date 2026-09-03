/** Parse `Authorization: Bearer <jwt>` from web cookies-or-mobile requests. */
export function readBearerToken(authorizationHeader: string | null | undefined): string {
  if (!authorizationHeader) return "";
  const value = authorizationHeader.trim();
  if (!value.toLowerCase().startsWith("bearer ")) return "";
  return value.slice(7).trim();
}
