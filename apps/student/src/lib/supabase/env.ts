/**
 * Public Supabase config. Prefer the current publishable key name, keep
 * NEXT_PUBLIC_SUPABASE_ANON_KEY for existing Vercel projects.
 * Never expose the service role to the browser.
 */

export function getSupabaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
    process.env.SUPABASE_URL?.trim() ||
    ""
  );
}

export function getSupabaseAnonKey(): string {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    ""
  );
}

/** Server-only. Used for grants (existing) and optional admin mirrors. */
export function getSupabaseServiceKey(): string {
  return (
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    process.env.SUPABASE_SERVICE_KEY?.trim() ||
    ""
  );
}

export function isSupabaseConfigured(): boolean {
  return Boolean(getSupabaseUrl() && getSupabaseAnonKey());
}

export function isDemoRosterEnabled(): boolean {
  return process.env.NEXT_PUBLIC_DEMO_ROSTER === "1";
}
