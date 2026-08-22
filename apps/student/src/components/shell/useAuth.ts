"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getCurrentUser,
  loginUser,
  logoutUser,
  registerUser,
  subscribeAuth,
  type LoginInput,
  type PublicUser,
  type RegisterInput,
} from "@/lib/auth";

export type AuthStatus = "loading" | "guest" | "authed";

export function useAuth() {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");

  useEffect(() => {
    const sync = () => {
      const current = getCurrentUser();
      setUser(current);
      setStatus(current ? "authed" : "guest");
    };
    sync();
    const unsub = subscribeAuth(sync);
    return () => unsub();
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
