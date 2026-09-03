import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies, headers } from "next/headers";
import { getSupabaseAnonKey, getSupabaseUrl, isSupabaseConfigured } from "./env";

/**
 * Request-scoped Supabase client for Server Components, Route Handlers, and
 * Server Actions. Cookie writes from Server Components are ignored; middleware
 * refreshes the session on each request.
 *
 * Expo Go sends `Authorization: Bearer <access_token>` instead of cookies.
 */
export async function createServerSupabase() {
  if (!isSupabaseConfigured()) return null;

  const headerStore = await headers();
  const authHeader = headerStore.get("authorization") ?? headerStore.get("Authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";

  if (token) {
    return createClient(getSupabaseUrl(), getSupabaseAnonKey(), {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
  }

  const cookieStore = await cookies();
  return createServerClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet, headers) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
          const h = headers ?? {};
          void h;
        } catch {
          /* Server Components cannot always set cookies; middleware will. */
        }
      },
    },
  });
}
