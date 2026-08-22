"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import {
  ROLE_STORAGE_KEY,
  isUserRole,
  roleForPath,
  type UserRole,
} from "@/lib/site-nav";

export function useSelectedRole() {
  const pathname = usePathname() || "/";
  const [role, setRoleState] = useState<UserRole | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let next: UserRole | null = null;
    try {
      const stored = localStorage.getItem(ROLE_STORAGE_KEY);
      if (isUserRole(stored)) next = stored;
    } catch {
      /* ignore */
    }

    next = next ?? roleForPath(pathname);

    if (next) {
      try {
        localStorage.setItem(ROLE_STORAGE_KEY, next);
      } catch {
        /* ignore */
      }
    }

    setRoleState(next);
    setReady(true);
  }, [pathname]);

  const setRole = useCallback((next: UserRole) => {
    setRoleState(next);
    try {
      localStorage.setItem(ROLE_STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }, []);

  const clearRole = useCallback(() => {
    setRoleState(null);
    try {
      localStorage.removeItem(ROLE_STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  return { role, ready, setRole, clearRole };
}
