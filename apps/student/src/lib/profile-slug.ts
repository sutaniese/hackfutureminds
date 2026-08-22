/**
 * Stable URL segment for a user email (no `@` in path; reversible on the client).
 * Data stays browser-local — the same slug on another device shows “not found”
 * unless that browser has the same account.
 */

function utf8Encode(s: string): Uint8Array {
  return new TextEncoder().encode(s);
}

function utf8Decode(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes);
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]!);
  const b64 = btoa(bin);
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlToBytes(slug: string): Uint8Array | null {
  try {
    const pad = "===".slice((slug.length + 3) % 4);
    const b64 = slug.replace(/-/g, "+").replace(/_/g, "/") + pad;
    const bin = atob(b64);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  } catch {
    return null;
  }
}

export function emailToProfileSlug(email: string): string {
  const norm = email.trim().toLowerCase();
  return bytesToBase64Url(utf8Encode(norm));
}

export function profileSlugToEmail(slug: string): string | null {
  const raw = slug.trim();
  if (!raw) return null;
  const bytes = base64UrlToBytes(decodeURIComponent(raw));
  if (!bytes) return null;
  const email = utf8Decode(bytes).trim().toLowerCase();
  return email || null;
}

export function profileHref(email: string): string {
  return `/profile/${emailToProfileSlug(email)}`;
}
