/**
 * Invite-code helpers shared by the local vault fallback and tests.
 * Production codes are generated in Postgres (`generate_invite_code`).
 */

const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function normalizeInviteCode(code: string): string {
  return code.trim().toUpperCase().replace(/\s+/g, "");
}

export function generateInviteCode(existing: Iterable<string> = []): string {
  const taken = new Set([...existing].map(normalizeInviteCode));
  for (let attempt = 0; attempt < 50; attempt += 1) {
    let s = "TN-";
    for (let i = 0; i < 6; i += 1) s += CHARS[Math.floor(Math.random() * CHARS.length)];
    if (!taken.has(s)) return s;
  }
  return `TN-${Date.now().toString(36).toUpperCase().slice(-6)}`;
}

export function isInviteCodeFormat(code: string): boolean {
  return /^TN-[A-Z0-9]{6}$/.test(normalizeInviteCode(code));
}
