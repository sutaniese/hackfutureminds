import * as Crypto from "expo-crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { isUserRole, type UserRole } from "./site-nav";
import { getSupabaseAnonKey, getSupabaseUrl, isSupabaseConfigured } from "./env";
import { memoryGet, memoryRemove, memorySet, subscribeStorage } from "./storage";

export const USERS_STORAGE_KEY = "pathwise-auth-users";
export const SESSION_STORAGE_KEY = "pathwise-auth-session";
export const PROFILE_CACHE_KEY = "ten-auth-profile";

export type PublicUser = {
  email: string;
  name?: string;
  role: UserRole;
  createdAt: number;
};

export type LoginInput = { email: string; password: string };
export type RegisterInput = LoginInput & { role: UserRole; name?: string };

export class AuthFailure extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function isStrongEnoughPassword(password: string): boolean {
  return password.length >= 6;
}

let supabase: SupabaseClient | null = null;
let accessToken: string | null = null;
let cachedUser: PublicUser | null = null;

export function getAccessToken(): string | null {
  return accessToken;
}

export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  if (supabase) return supabase;
  supabase = createClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });
  return supabase;
}

type ProfileRow = {
  id: string;
  email: string;
  display_name: string | null;
  role: string;
  created_at: string;
};

function mapProfile(row: ProfileRow): PublicUser {
  return {
    email: row.email,
    name: row.display_name ?? undefined,
    role: isUserRole(row.role) ? row.role : "student",
    createdAt: Date.parse(row.created_at) || Date.now(),
  };
}

function writeCachedProfile(user: PublicUser | null): void {
  cachedUser = user;
  if (!user) memoryRemove(PROFILE_CACHE_KEY);
  else memorySet(PROFILE_CACHE_KEY, JSON.stringify(user));
}

function readCachedProfile(): PublicUser | null {
  try {
    const raw = memoryGet(PROFILE_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PublicUser;
    if (!parsed?.email || !isUserRole(parsed.role)) return null;
    return parsed;
  } catch {
    return null;
  }
}

async function loadProfile(userId: string, email: string): Promise<PublicUser | null> {
  const client = getSupabase();
  if (!client) return null;
  const { data, error } = await client
    .from("profiles")
    .select("id, email, display_name, role, created_at")
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
  input: { role: UserRole; name?: string },
): Promise<PublicUser> {
  const client = getSupabase();
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
    })
    .select("id, email, display_name, role, created_at")
    .single();
  if (error) {
    const raced = await loadProfile(userId, email);
    if (raced) return raced;
    throw new AuthFailure("storage", error.message);
  }
  const mapped = mapProfile(data as ProfileRow);
  writeCachedProfile(mapped);
  return mapped;
}

type StoredUser = PublicUser & { salt: string; hash: string };

async function hashPassword(password: string, salt: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${salt}:${password}`);
}

function readLocalUsers(): Record<string, StoredUser> {
  try {
    const raw = memoryGet(USERS_STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, StoredUser>;
  } catch {
    return {};
  }
}

function writeLocalUsers(users: Record<string, StoredUser>): void {
  memorySet(USERS_STORAGE_KEY, JSON.stringify(users));
}

function readLocalSessionEmail(): string | null {
  try {
    const raw = memoryGet(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { email?: string };
    return parsed.email ?? null;
  } catch {
    return null;
  }
}

export function getCurrentUser(): PublicUser | null {
  if (cachedUser) return cachedUser;
  cachedUser = readCachedProfile();
  if (cachedUser) return cachedUser;
  if (!isSupabaseConfigured()) {
    const email = readLocalSessionEmail();
    if (!email) return null;
    const users = readLocalUsers();
    const stored = users[email];
    if (!stored) return null;
    cachedUser = {
      email: stored.email,
      name: stored.name,
      role: stored.role,
      createdAt: stored.createdAt,
    };
    return cachedUser;
  }
  return null;
}

export async function hydrateAuth(): Promise<PublicUser | null> {
  if (!isSupabaseConfigured()) {
    cachedUser = getCurrentUser();
    return cachedUser;
  }
  const client = getSupabase();
  if (!client) return null;
  const { data } = await client.auth.getSession();
  accessToken = data.session?.access_token ?? null;
  if (!data.session?.user) {
    writeCachedProfile(null);
    return null;
  }
  const profile = await loadProfile(data.session.user.id, data.session.user.email ?? "");
  client.auth.onAuthStateChange((_event, session) => {
    accessToken = session?.access_token ?? null;
    if (!session?.user) writeCachedProfile(null);
  });
  return profile;
}

export async function registerUser(input: RegisterInput): Promise<PublicUser> {
  const email = input.email.trim().toLowerCase();
  if (!isValidEmail(email)) throw new AuthFailure("invalid-email", "Введите корректный email.");
  if (!isStrongEnoughPassword(input.password)) {
    throw new AuthFailure("weak-password", "Пароль должен содержать не меньше 6 символов.");
  }
  if (!isUserRole(input.role)) {
    throw new AuthFailure("invalid-role", "Выберите роль: студент, родитель или учитель.");
  }

  if (!isSupabaseConfigured()) {
    const users = readLocalUsers();
    if (users[email]) throw new AuthFailure("email-taken", "Аккаунт с таким email уже существует.");
    const salt = Math.random().toString(36).slice(2);
    const hash = await hashPassword(input.password, salt);
    const user: StoredUser = {
      email,
      name: input.name?.trim() || undefined,
      role: input.role,
      createdAt: Date.now(),
      salt,
      hash,
    };
    users[email] = user;
    writeLocalUsers(users);
    memorySet(SESSION_STORAGE_KEY, JSON.stringify({ email }));
    writeCachedProfile(user);
    return user;
  }

  const client = getSupabase();
  if (!client) throw new AuthFailure("storage", "Supabase is not configured.");
  const { data, error } = await client.auth.signUp({
    email,
    password: input.password,
    options: { data: { display_name: input.name?.trim() || "" } },
  });
  if (error) throw new AuthFailure("storage", error.message);
  let session = data.session;
  let user = data.user;
  if (!session || !user) {
    const signed = await client.auth.signInWithPassword({ email, password: input.password });
    if (signed.error || !signed.data.user) {
      throw new AuthFailure(
        "storage",
        "Аккаунт создан, но сессия не открылась. В проекте Supabase отключите Confirm email.",
      );
    }
    session = signed.data.session;
    user = signed.data.user;
  }
  accessToken = session?.access_token ?? null;
  return ensureProfile(user.id, email, { role: input.role, name: input.name });
}

export async function loginUser(input: LoginInput): Promise<PublicUser> {
  const email = input.email.trim().toLowerCase();
  if (!isValidEmail(email)) throw new AuthFailure("invalid-email", "Введите корректный email.");

  if (!isSupabaseConfigured()) {
    const users = readLocalUsers();
    const stored = users[email];
    if (!stored) throw new AuthFailure("wrong-password", "Неверный email или пароль.");
    const hash = await hashPassword(input.password, stored.salt);
    if (hash !== stored.hash) throw new AuthFailure("wrong-password", "Неверный email или пароль.");
    memorySet(SESSION_STORAGE_KEY, JSON.stringify({ email }));
    writeCachedProfile(stored);
    return stored;
  }

  const client = getSupabase();
  if (!client) throw new AuthFailure("storage", "Supabase is not configured.");
  const { data, error } = await client.auth.signInWithPassword({ email, password: input.password });
  if (error || !data.user) {
    throw new AuthFailure("wrong-password", error?.message ?? "Неверный email или пароль.");
  }
  accessToken = data.session?.access_token ?? null;
  const profile = await loadProfile(data.user.id, data.user.email ?? email);
  if (!profile) {
    throw new AuthFailure("not-found", "Профиль не найден. Зарегистрируйтесь заново с нужной ролью.");
  }
  return profile;
}

export async function logoutUser(): Promise<void> {
  accessToken = null;
  writeCachedProfile(null);
  memoryRemove(SESSION_STORAGE_KEY);
  if (isSupabaseConfigured()) {
    await getSupabase()?.auth.signOut();
  }
}

export function subscribeAuth(listener: () => void): () => void {
  return subscribeStorage(listener);
}
