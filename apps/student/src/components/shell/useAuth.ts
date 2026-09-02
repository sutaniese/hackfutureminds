"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getCurrentUser,
  hydrateAuth,
  isAuthHydrated,
  loginUser,
  logoutUser,
  registerUser,
  subscribeAuth,
  type LoginInput,
  type PublicUser,
  type RegisterInput,
} from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export type AuthStatus = "loading" | "guest" | "authed";

export function useAuth() {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");

  useEffect(() => {
    let cancelled = false;
    const apply = (current: PublicUser | null) => {
      if (cancelled) return;
      setUser(current);
      setStatus(current ? "authed" : "guest");
    };

    const sync = () => apply(getCurrentUser());

    if (isSupabaseConfigured() && !isAuthHydrated()) {
      void hydrateAuth()
        .then((current) => apply(current))
        .catch(() => apply(null));
    } else {
      sync();
    }

    const unsub = subscribeAuth(sync);
    return () => {
      cancelled = true;
      unsub();
    };
  }, []);

  const login = useCallback(async (input: LoginInput) => {
    const next = await loginUser(input);
    setUser(next);
    setStatus("authed");
    return next;
  }, []);

  const register = useCallback(async (input: RegisterInput) => {
    const next = await registerUser(input);
    setUser(next);
    setStatus("authed");
    return next;
  }, []);

  const logout = useCallback(() => {
    logoutUser();
    setUser(null);
    setStatus("guest");
  }, []);

  return { user, status, login, register, logout };
}
