/**
 * Public assets for the portal UI live on the same Next.js origin (`/public`).
 */
export function withAssetBase(path: string | null | undefined): string | undefined {
  if (path == null || path === "") return undefined;
  if (/^https?:\/\//i.test(path)) return path;
  return path.startsWith("/") ? path : `/${path}`;
}
