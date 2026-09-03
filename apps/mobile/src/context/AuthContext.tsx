import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  getCurrentUser,
  hydrateAuth,
  loginUser,
  logoutUser,
  registerUser,
  subscribeAuth,
  type LoginInput,
  type PublicUser,
  type RegisterInput,
} from "../lib/auth";
import { cabinetPathForRole } from "../lib/site-nav";

type AuthValue = {
  user: PublicUser | null;
  status: "loading" | "guest" | "authed";
  login: (input: LoginInput) => Promise<PublicUser>;
  register: (input: RegisterInput) => Promise<PublicUser>;
  logout: () => Promise<void>;
  homePath: string;
};

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [status, setStatus] = useState<AuthValue["status"]>("loading");

  useEffect(() => {
    let alive = true;
    void hydrateAuth().then((next) => {
      if (!alive) return;
      setUser(next ?? getCurrentUser());
      setStatus(next || getCurrentUser() ? "authed" : "guest");
    });
    const unsub = subscribeAuth(() => {
      const current = getCurrentUser();
      setUser(current);
      setStatus(current ? "authed" : "guest");
    });
    return () => {
      alive = false;
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

  const logout = useCallback(async () => {
    await logoutUser();
    setUser(null);
    setStatus("guest");
  }, []);

  const value = useMemo<AuthValue>(
    () => ({
      user,
      status,
      login,
      register,
      logout,
      homePath: user ? cabinetPathForRole(user.role) : "/",
    }),
    [user, status, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
