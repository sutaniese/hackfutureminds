/**
 * Account facade: Supabase Auth in production, local PBKDF2 only when env is empty.
 * Role is stored in `profiles` (RLS) / app_metadata — never authorized off user_metadata.
 */

import { isUserRole, type UserRole } from "@/lib/site-nav";
import { createBrowserSupabase } from "@/lib/supabase/browser";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import {
  AUTH_EVENT,
  AuthFailure,
  getCurrentUser as localGetCurrentUser,
  getPublicUserByEmail as localGetPublicUserByEmail,
  isStrongEnoughPassword,
  isValidEmail,
  listPublicUsers as localListPublicUsers,
  loginUser as localLoginUser,
  logoutUser as localLogoutUser,
  registerUser as localRegisterUser,
  SESSION_STORAGE_KEY,
  subscribeAuth as localSubscribeAuth,
  USERS_STORAGE_KEY,
  type AuthError,
  type DisabilityDocumentEvaluation,
  type DisabilityDocumentMeta,
  type DisabilitySupportType,
  type LoginInput,
  type PublicUser,
  type RegisterInput,
  type StudentAccessibilitySupport,
  type StoredUser,
} from "@/lib/auth-local";

export {
  AUTH_EVENT,
  AuthFailure,
  isStrongEnoughPassword,
  isValidEmail,
  SESSION_STORAGE_KEY,
  USERS_STORAGE_KEY,
  type AuthError,
  type DisabilityDocumentEvaluation,
  type DisabilityDocumentMeta,
  type DisabilitySupportType,
  type LoginInput,
  type PublicUser,
  type RegisterInput,
  type StudentAccessibilitySupport,
  type StoredUser,
};

type ProfileRow = {
  id: string;
  email: string;
  display_name: string | null;
  role: string;
  accessibility_support: StudentAccessibilitySupport | null;
  created_at: string;
};

const PROFILE_CACHE_KEY = "ten-auth-profile";

let cachedUser: PublicUser | null = null;
let supabaseReady = false;
let supabaseListenerBound = false;

function hasWindow(): boolean {
  return typeof window !== "undefined";
}

function emitChange(): void {
  if (!hasWindow()) return;
  try {
    window.dispatchEvent(new CustomEvent(AUTH_EVENT));
  } catch {
    /* ignore */
  }
}

function readCachedProfile(): PublicUser | null {
  if (!hasWindow()) return null;
  try {
    const raw = window.localStorage.getItem(PROFILE_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PublicUser;
    if (!parsed?.email || !isUserRole(parsed.role)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCachedProfile(user: PublicUser | null): void {
  cachedUser = user;
  if (!hasWindow()) return;
  try {
    if (!user) window.localStorage.removeItem(PROFILE_CACHE_KEY);
    else window.localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(user));
  } catch {
    /* ignore */
  }
}

function mapProfile(row: ProfileRow): PublicUser {
  return {
    email: row.email,
    name: row.display_name ?? undefined,
    role: isUserRole(row.role) ? row.role : "student",
    accessibilitySupport: row.accessibility_support ?? undefined,
    createdAt: Date.parse(row.created_at) || Date.now(),
  };
}

function mapAuthError(message: string): AuthFailure {
  const lower = message.toLowerCase();
  if (lower.includes("already registered") || lower.includes("already been registered")) {
    return new AuthFailure("email-taken", "Аккаунт с таким email уже существует.");
  }
  if (lower.includes("invalid login") || lower.includes("invalid credentials")) {
    return new AuthFailure("wrong-password", "Неверный email или пароль.");
  }
  if (lower.includes("email")) {
    return new AuthFailure("invalid-email", message);
  }
  return new AuthFailure("storage", message);
}

async function loadProfile(userId: string, email: string): Promise<PublicUser | null> {
  const client = createBrowserSupabase();
  if (!client) return null;
  const { data, error } = await client
    .from("profiles")
    .select("id, email, display_name, role, accessibility_support, created_at")
    .eq("id", userId)
    .maybeSingle();
  if (error || !data) return null;
  const mapped = mapProfile(data as ProfileRow);
  if (!mapped.email) mapped.email = email;
  writeCachedProfile(mapped);
  return mapped;
}

async function ensureProfile(
  userId: string,
  email: string,
  input: { role: UserRole; name?: string; accessibilitySupport?: StudentAccessibilitySupport },
): Promise<PublicUser> {
  const client = createBrowserSupabase();
  if (!client) throw new AuthFailure("storage", "Supabase client is not available.");

  const existing = await loadProfile(userId, email);
  if (existing) return existing;

  const { data, error } = await client
    .from("profiles")
    .insert({
      id: userId,
      email,
      display_name: input.name?.trim() || null,
      role: input.role,
      accessibility_support: input.accessibilitySupport ?? null,
    })
    .select("id, email, display_name, role, accessibility_support, created_at")
    .single();

  if (error) {
    const raced = await loadProfile(userId, email);
    if (raced) return raced;
    throw mapAuthError(error.message);
  }
  const mapped = mapProfile(data as ProfileRow);
  writeCachedProfile(mapped);
  return mapped;
}

function bindSupabaseListener(): void {
  if (supabaseListenerBound || !hasWindow()) return;
  const client = createBrowserSupabase();
  if (!client) return;
  supabaseListenerBound = true;
  client.auth.onAuthStateChange((_event, session) => {
    void (async () => {
      if (!session?.user) {
        writeCachedProfile(null);
        supabaseReady = true;
        emitChange();
        return;
      }
      const profile = await loadProfile(session.user.id, session.user.email ?? "");
      if (profile) writeCachedProfile(profile);
      supabaseReady = true;
      emitChange();
    })();
  });
}

export function isAuthHydrated(): boolean {
  if (!isSupabaseConfigured()) return true;
  return supabaseReady;
}

export function getCurrentUser(): PublicUser | null {
  if (!isSupabaseConfigured()) return localGetCurrentUser();
  bindSupabaseListener();
  if (cachedUser) return cachedUser;
  cachedUser = readCachedProfile();
  return cachedUser;
}

export function getPublicUserByEmail(email: string): PublicUser | null {
  if (!isSupabaseConfigured()) return localGetPublicUserByEmail(email);
  const current = getCurrentUser();
  if (current && current.email === email.trim().toLowerCase()) return current;
  return null;
}

export function listPublicUsers(role?: UserRole): PublicUser[] {
  if (!isSupabaseConfigured()) return localListPublicUsers(role);
  const current = getCurrentUser();
  if (!current) return [];
  if (role && current.role !== role) return [];
  return [current];
}

export async function hydrateAuth(): Promise<PublicUser | null> {
  if (!isSupabaseConfigured()) return localGetCurrentUser();
  bindSupabaseListener();
  const client = createBrowserSupabase();
  if (!client) {
    supabaseReady = true;
    return null;
  }
  const { data } = await client.auth.getSession();
  if (!data.session?.user) {
    writeCachedProfile(null);
    supabaseReady = true;
    emitChange();
    return null;
  }
  const profile = await loadProfile(data.session.user.id, data.session.user.email ?? "");
  supabaseReady = true;
  emitChange();
  return profile;
}

export async function registerUser(input: RegisterInput): Promise<PublicUser> {
  if (!isSupabaseConfigured()) return localRegisterUser(input);

  const email = input.email.trim().toLowerCase();
  if (!isValidEmail(email)) throw new AuthFailure("invalid-email", "Введите корректный email.");
  if (!isStrongEnoughPassword(input.password)) {
    throw new AuthFailure("weak-password", "Пароль должен содержать не меньше 6 символов.");
  }
  if (!isUserRole(input.role)) {
    throw new AuthFailure("invalid-role", "Выберите роль: студент, родитель или учитель.");
  }

  const client = createBrowserSupabase();
  if (!client) throw new AuthFailure("storage", "Supabase is not configured.");

  const { data, error } = await client.auth.signUp({
    email,
    password: input.password,
    options: {
      data: { display_name: input.name?.trim() || "" },
    },
  });
  if (error) throw mapAuthError(error.message);

  let session = data.session;
  let user = data.user;
  if (!session || !user) {
    const signed = await client.auth.signInWithPassword({ email, password: input.password });
    if (signed.error || !signed.data.user) {
      throw new AuthFailure(
        "storage",
        "Аккаунт создан, но сессия не открылась. В проекте Supabase отключите Confirm email для демо.",
      );
    }
    session = signed.data.session;
    user = signed.data.user;
  }

  const profile = await ensureProfile(user.id, email, {
    role: input.role,
    name: input.name,
    accessibilitySupport: input.accessibilitySupport,
  });
  supabaseReady = true;
  emitChange();
  return profile;
}

export async function loginUser(input: LoginInput): Promise<PublicUser> {
  if (!isSupabaseConfigured()) return localLoginUser(input);

  const email = input.email.trim().toLowerCase();
  if (!isValidEmail(email)) throw new AuthFailure("invalid-email", "Введите корректный email.");

  const client = createBrowserSupabase();
  if (!client) throw new AuthFailure("storage", "Supabase is not configured.");

  const { data, error } = await client.auth.signInWithPassword({
    email,
    password: input.password,
  });
  if (error || !data.user) {
    throw mapAuthError(error?.message ?? "Неверный email или пароль.");
  }

  const profile = await loadProfile(data.user.id, data.user.email ?? email);
  if (!profile) {
    throw new AuthFailure(
      "not-found",
      "Профиль не найден. Зарегистрируйтесь заново с нужной ролью.",
    );
  }
  supabaseReady = true;
  emitChange();
  return profile;
}

export function logoutUser(): void {
  if (!isSupabaseConfigured()) {
    localLogoutUser();
    return;
  }
  writeCachedProfile(null);
  emitChange();
  const client = createBrowserSupabase();
  void client?.auth.signOut();
}

/** Role is immutable after registration. Kept for call-site compatibility. */
export function updateCurrentUserRole(role: UserRole): PublicUser | null {
  void role;
  return getCurrentUser();
}

export function subscribeAuth(listener: () => void): () => void {
  if (!isSupabaseConfigured()) return localSubscribeAuth(listener);
  bindSupabaseListener();
  if (hasWindow()) {
    window.addEventListener(AUTH_EVENT, listener as EventListener);
    return () => window.removeEventListener(AUTH_EVENT, listener as EventListener);
  }
  return () => undefined;
}
