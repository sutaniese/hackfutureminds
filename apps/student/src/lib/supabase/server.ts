import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseAnonKey, getSupabaseUrl, isSupabaseConfigured } from "./env";

/**
 * Request-scoped Supabase client for Server Components, Route Handlers, and
 * Server Actions. Cookie writes from Server Components are ignored; middleware
 * refreshes the session on each request.
 */
export async function createServerSupabase() {
  if (!isSupabaseConfigured()) return null;
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
