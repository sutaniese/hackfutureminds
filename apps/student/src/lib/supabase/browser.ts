"use client";

import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseAnonKey, getSupabaseUrl, isSupabaseConfigured } from "./env";

export function createBrowserSupabase() {
  if (!isSupabaseConfigured()) return null;
  return createBrowserClient(getSupabaseUrl(), getSupabaseAnonKey());
}
