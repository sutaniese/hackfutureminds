/**
 * Prefix public asset paths with Vite `base` (e.g. `/hub/`) so logos work when the
 * portal is mounted under a subpath on the student origin.
 */
export function withAssetBase(path: string | null | undefined): string | undefined {
  if (path == null || path === '') return undefined
  if (/^https?:\/\//i.test(path)) return path
  const base = (import.meta.env.BASE_URL ?? '/').replace(/\/$/, '')
  const p = path.startsWith('/') ? path : `/${path}`
  return `${base}${p}`
}
