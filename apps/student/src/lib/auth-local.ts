import type { UserRole } from "@/lib/site-nav";
import { isUserRole } from "@/lib/site-nav";

/**
 * Local-storage auth fallback used only when Supabase env vars are empty
 * (`NEXT_PUBLIC_SUPABASE_URL` / anon key). Production uses Supabase Auth.
 *
 * Storage layout:
 *   pathwise-auth-users    -> Record<emailLower, StoredUser>
 *   pathwise-auth-session  -> { email: emailLower } | null
 *
 * Passwords are never stored in plaintext: PBKDF2-SHA256 (200k iterations).
 * This cannot share a class across two devices — that path requires Supabase.
 */

export const USERS_STORAGE_KEY = "pathwise-auth-users";
export const SESSION_STORAGE_KEY = "pathwise-auth-session";
export const AUTH_EVENT = "pathwise-auth-changed";

const PBKDF2_ITERATIONS = 200_000;
const SALT_BYTES = 16;
const KEY_BITS = 256;

export type StoredUser = {
  email: string; // lowercased, trimmed
  name?: string;
  role: UserRole;
  accessibilitySupport?: StudentAccessibilitySupport;
  saltB64: string;
  hashB64: string;
  iterations: number;
  createdAt: number;
};

export type DisabilitySupportType =
  | "visual"
  | "hearing"
  | "mobility"
  | "learning"
  | "neurodivergent"
  | "chronic"
  | "speech"
  | "mental-health"
  | "other";

export type DisabilityDocumentMeta = {
  name: string;
  type: string;
  size: number;
  uploadedAt: number;
  evaluation?: DisabilityDocumentEvaluation;
};

export type DisabilityDocumentEvaluation = {
  status: "reviewed" | "needs_human_review";
  documentType: string;
  summary: string;
  confidence: number;
  detectedSupportTypes: DisabilitySupportType[];
  recommendedAccommodations: string[];
  caveats: string[];
  evaluatedAt: number;
};

export type StudentAccessibilitySupport = {
  enabled: boolean;
  supportTypes: DisabilitySupportType[];
  notes?: string;
  document?: DisabilityDocumentMeta;
};

export type PublicUser = Pick<
  StoredUser,
  "email" | "name" | "role" | "accessibilitySupport" | "createdAt"
>;

export type AuthError =
  | "invalid-email"
  | "weak-password"
  | "email-taken"
  | "not-found"
  | "wrong-password"
  | "invalid-role"
  | "no-crypto"
  | "storage";

export class AuthFailure extends Error {
  code: AuthError;
  constructor(code: AuthError, message?: string) {
    super(message ?? code);
    this.code = code;
    this.name = "AuthFailure";
  }
}

function hasWindow(): boolean {
  return typeof window !== "undefined";
}

function bytesToB64(bytes: ArrayBuffer | Uint8Array): string {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let bin = "";
  for (let i = 0; i < view.length; i++) bin += String.fromCharCode(view[i]);
  if (typeof btoa === "function") return btoa(bin);
  if (typeof Buffer !== "undefined") return Buffer.from(bin, "binary").toString("base64");
  throw new AuthFailure("no-crypto", "Base64 is not available in this environment.");
}

function b64ToBytes(b64: string): Uint8Array {
  let bin: string;
  if (typeof atob === "function") {
    bin = atob(b64);
  } else if (typeof Buffer !== "undefined") {
    bin = Buffer.from(b64, "base64").toString("binary");
  } else {
    throw new AuthFailure("no-crypto", "Base64 decode is not available in this environment.");
  }
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function deriveHash(
  password: string,
  saltBytes: Uint8Array,
  iterations: number,
): Promise<string> {
  if (!hasWindow() || !window.crypto?.subtle) {
    throw new AuthFailure("no-crypto", "Web Crypto API не доступен в этом окружении.");
  }
  const enc = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits"],
  );
  const bits = await window.crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      // PBKDF2 spec accepts BufferSource. ArrayBufferView is fine.
      salt: saltBytes,
      iterations,
    },
    keyMaterial,
    KEY_BITS,
  );
  return bytesToB64(bits);
}

function isStoredUser(value: unknown): value is StoredUser {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.email === "string" &&
    typeof v.saltB64 === "string" &&
    typeof v.hashB64 === "string" &&
    typeof v.iterations === "number" &&
    typeof v.createdAt === "number" &&
    isUserRole(typeof v.role === "string" ? v.role : null)
  );
}

const DISABILITY_SUPPORT_TYPES: ReadonlySet<DisabilitySupportType> = new Set([
  "visual",
  "hearing",
  "mobility",
  "learning",
  "neurodivergent",
  "chronic",
  "speech",
  "mental-health",
  "other",
]);

function isDisabilitySupportType(value: unknown): value is DisabilitySupportType {
  return typeof value === "string" && DISABILITY_SUPPORT_TYPES.has(value as DisabilitySupportType);
}

function sanitizeAccessibilitySupport(
  role: UserRole,
  support: StudentAccessibilitySupport | undefined,
): StudentAccessibilitySupport | undefined {
  if (role !== "student" || !support?.enabled) return undefined;

  const supportTypes = support.supportTypes.filter(isDisabilitySupportType);
  const notes = support.notes?.trim();
  const document = support.document
    ? {
        name: support.document.name,
        type: support.document.type,
        size: support.document.size,
        uploadedAt: support.document.uploadedAt,
        evaluation: support.document.evaluation,
      }
    : undefined;

  return {
    enabled: true,
    supportTypes,
    notes: notes || undefined,
    document,
  };
}

function readUsers(): Record<string, StoredUser> {
  if (!hasWindow()) return {};
  try {
    const raw = window.localStorage.getItem(USERS_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const out: Record<string, StoredUser> = {};
    for (const [email, user] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof email === "string" && isStoredUser(user)) {
        out[email] = user;
      }
    }
    return out;
  } catch {
    return {};
  }
}

function writeUsers(users: Record<string, StoredUser>): void {
  if (!hasWindow()) return;
  try {
    window.localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
  } catch {
    throw new AuthFailure("storage", "Не удалось сохранить данные пользователя.");
  }
}

function readSessionEmail(): string | null {
  if (!hasWindow()) return null;
  try {
    const raw = window.localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { email?: unknown } | null;
    if (parsed && typeof parsed.email === "string") return parsed.email;
    return null;
  } catch {
    return null;
  }
}

function writeSession(email: string | null): void {
  if (!hasWindow()) return;
  try {
    if (email == null) {
      window.localStorage.removeItem(SESSION_STORAGE_KEY);
    } else {
      window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ email }));
    }
  } catch {
    throw new AuthFailure("storage", "Не удалось сохранить сессию.");
  }
}

function emitChange(): void {
  if (!hasWindow()) return;
  try {
    window.dispatchEvent(new CustomEvent(AUTH_EVENT));
  } catch {
    /* ignore */
  }
}

function toPublic(user: StoredUser): PublicUser {
  return {
    email: user.email,
    name: user.name,
    role: user.role,
    accessibilitySupport: user.accessibilitySupport,
    createdAt: user.createdAt,
  };
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(email.trim());
}

export function isStrongEnoughPassword(password: string): boolean {
  return typeof password === "string" && password.length >= 6;
}

export function getCurrentUser(): PublicUser | null {
  const email = readSessionEmail();
  if (!email) return null;
  return getPublicUserByEmail(email);
}

/** Public card for an account stored in this browser (same as `getCurrentUser` when session matches). */
export function getPublicUserByEmail(email: string): PublicUser | null {
  if (!hasWindow()) return null;
  const key = normalizeEmail(email);
  if (!key) return null;
  const users = readUsers();
  const user = users[key];
  if (!user) return null;
  return toPublic(user);
}

export function listPublicUsers(role?: UserRole): PublicUser[] {
  const users = Object.values(readUsers()).map(toPublic);
  return role ? users.filter((user) => user.role === role) : users;
}

export type RegisterInput = {
  email: string;
  password: string;
  role: UserRole;
  name?: string;
  accessibilitySupport?: StudentAccessibilitySupport;
};

export async function registerUser(input: RegisterInput): Promise<PublicUser> {
  const email = normalizeEmail(input.email);
  if (!isValidEmail(email)) throw new AuthFailure("invalid-email", "Введите корректный email.");
  if (!isStrongEnoughPassword(input.password)) {
    throw new AuthFailure("weak-password", "Пароль должен содержать не меньше 6 символов.");
  }
  if (!isUserRole(input.role)) {
    throw new AuthFailure("invalid-role", "Выберите роль: студент, родитель или учитель.");
  }

  const users = readUsers();
  if (users[email]) throw new AuthFailure("email-taken", "Аккаунт с таким email уже существует.");

  const salt = window.crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const hashB64 = await deriveHash(input.password, salt, PBKDF2_ITERATIONS);

  const user: StoredUser = {
    email,
    name: input.name?.trim() || undefined,
    role: input.role,
    accessibilitySupport: sanitizeAccessibilitySupport(
      input.role,
      input.accessibilitySupport,
    ),
    saltB64: bytesToB64(salt),
    hashB64,
    iterations: PBKDF2_ITERATIONS,
    createdAt: Date.now(),
  };
  users[email] = user;
  writeUsers(users);
  writeSession(email);
  emitChange();
  return toPublic(user);
}

export type LoginInput = {
  email: string;
  password: string;
};

export async function loginUser(input: LoginInput): Promise<PublicUser> {
  const email = normalizeEmail(input.email);
  if (!isValidEmail(email)) throw new AuthFailure("invalid-email", "Введите корректный email.");

  const users = readUsers();
  const user = users[email];
  if (!user) throw new AuthFailure("not-found", "Аккаунт не найден. Зарегистрируйтесь.");

  const salt = b64ToBytes(user.saltB64);
  const candidate = await deriveHash(input.password, salt, user.iterations);
  if (candidate !== user.hashB64) {
    throw new AuthFailure("wrong-password", "Неверный пароль.");
  }

  writeSession(email);
  emitChange();
  return toPublic(user);
}

export function logoutUser(): void {
  writeSession(null);
  emitChange();
}

/** Update the role of the currently signed-in user. */
export function updateCurrentUserRole(role: UserRole): PublicUser | null {
  if (!isUserRole(role)) return null;
  const email = readSessionEmail();
  if (!email) return null;
  const users = readUsers();
  const user = users[email];
  if (!user) return null;
  if (user.role !== role) {
    user.role = role;
    users[email] = user;
    writeUsers(users);
    emitChange();
  }
  return toPublic(user);
}

export function subscribeAuth(listener: () => void): () => void {
  if (!hasWindow()) return () => undefined;
  const onCustom = () => listener();
  const onStorage = (event: StorageEvent) => {
    if (
      event.key === USERS_STORAGE_KEY ||
      event.key === SESSION_STORAGE_KEY ||
      event.key === null
    ) {
      listener();
    }
  };
  window.addEventListener(AUTH_EVENT, onCustom as EventListener);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(AUTH_EVENT, onCustom as EventListener);
    window.removeEventListener("storage", onStorage);
  };
}
