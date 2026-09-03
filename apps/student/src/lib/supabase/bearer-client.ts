import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Expo / mobile API requests send `Authorization: Bearer <supabase access JWT>`.
 *
 * Do not pass that JWT as the supabase-js `accessToken` client option. That option
 * is for third-party auth (Clerk, Auth0, Firebase) and replaces `supabase.auth`
 * with a throwing proxy — `getClaims` / `getUser` then fail with:
 * "Supabase Client is configured with the accessToken option, accessing
 * supabase.auth.getClaims is not possible".
 *
 * Correct pattern: a normal client, JWT on the Authorization header for PostgREST
 * RLS, and `auth.getClaims(jwt)` / `auth.getUser(jwt)` with the token as an argument.
 */
export function createBearerSupabaseClient(
  url: string,
  anonKey: string,
  accessJwt: string,
): SupabaseClient {
  return createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${accessJwt}` } },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
