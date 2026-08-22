/**
 * Stable URL segment for a user email (no `@` in path; reversible on the client).
 * Data stays browser-local — the same slug on another device shows “not found”
 * unless that browser has the same account.
 *
 * Uses `Buffer` when available (Node / Next SSR) so we never rely on `atob`/`btoa`
 * during server render — those globals are missing in some Node runtimes.
 */

function utf8Encode(s: string): Uint8Array {
  return new TextEncoder().encode(s);
}

function utf8Decode(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes);
}

function bytesToBase64UrlBrowser(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]!);
  if (typeof btoa !== "function") {
    throw new Error("btoa is not available");
  }
  const b64 = btoa(bin);
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlToBytesBrowser(slug: string): Uint8Array | null {
  try {
    const pad = "===".slice((slug.length + 3) % 4);
    const b64 = slug.replace(/-/g, "+").replace(/_/g, "/") + pad;
    if (typeof atob !== "function") return null;
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
  if (typeof Buffer !== "undefined") {
    return Buffer.from(norm, "utf8").toString("base64url");
  }
  return bytesToBase64UrlBrowser(utf8Encode(norm));
}

export function profileSlugToEmail(slug: string): string | null {
  let raw = slug.trim();
  if (!raw) return null;
  try {
    raw = decodeURIComponent(raw);
  } catch {
    return null;
  }

  if (typeof Buffer !== "undefined") {
    try {
      const buf = Buffer.from(raw, "base64url");
      if (!buf.length) return null;
      const email = buf.toString("utf8").trim().toLowerCase();
      return email || null;
    } catch {
      return null;
    }
  }

  const bytes = base64UrlToBytesBrowser(raw);
  if (!bytes) return null;
  const email = utf8Decode(bytes).trim().toLowerCase();
  return email || null;
}

export function profileHref(email: string): string {
  return `/profile/${emailToProfileSlug(email)}`;
}
