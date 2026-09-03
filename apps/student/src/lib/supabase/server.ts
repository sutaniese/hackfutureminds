import { createServerClient } from "@supabase/ssr";
import { cookies, headers } from "next/headers";
import { readBearerToken } from "@/lib/server/bearer-token";
import { createBearerSupabaseClient } from "./bearer-client";
import { getSupabaseAnonKey, getSupabaseUrl, isSupabaseConfigured } from "./env";

/**
 * Request-scoped Supabase client for Server Components, Route Handlers, and
 * Server Actions. Cookie writes from Server Components are ignored; middleware
 * refreshes the session on each request.
 *
 * Expo Go sends `Authorization: Bearer <access_token>` instead of cookies.
 * Build a normal client (never the `accessToken` option) and pass that JWT to
 * `auth.getClaims(jwt)` / `auth.getUser(jwt)`. The Bearer header is enough for
 * PostgREST RLS. `accessToken` is third-party auth and blocks supabase.auth.*.
 */
export async function readRequestAccessToken(): Promise<string> {
  const headerStore = await headers();
  return readBearerToken(headerStore.get("authorization") ?? headerStore.get("Authorization"));
}

export async function createServerSupabase() {
  if (!isSupabaseConfigured()) return null;

  const token = await readRequestAccessToken();
  if (token) {
    return createBearerSupabaseClient(getSupabaseUrl(), getSupabaseAnonKey(), token);
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

export { createBearerSupabaseClient };
