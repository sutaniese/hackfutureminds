export function getApiUrl(): string {
  const raw = process.env.EXPO_PUBLIC_API_URL?.trim();
  return (raw || "https://buzhai.nurakhmet.info").replace(/\/$/, "");
}

export function getSupabaseUrl(): string {
  return process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() || "";
}

export function getSupabaseAnonKey(): string {
  return process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim() || "";
}

export function isSupabaseConfigured(): boolean {
  return Boolean(getSupabaseUrl() && getSupabaseAnonKey());
}

export function isDemoRosterEnabled(): boolean {
  return process.env.EXPO_PUBLIC_DEMO_ROSTER === "1";
}
