"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import {
  ROLE_STORAGE_KEY,
  isUserRole,
  roleForPath,
  type UserRole,
} from "@/lib/site-nav";
import {
  getCurrentUser,
  subscribeAuth,
} from "@/lib/auth";

/**
 * Resolves the active UI role.
 *
 * Priority:
 *   1. The role of the currently signed-in user (account always wins, the
 *      account chose its role at registration).
 *   2. A role saved earlier in localStorage (guest legacy flow).
 *   3. The role implied by the current URL.
 *
 * Calling `setRole` while signed in also rewrites the user's stored role —
 * that is the "заменяем текущий выбор роли" behaviour.
 */
export function useSelectedRole() {
  const pathname = usePathname() || "/";
  const [role, setRoleState] = useState<UserRole | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const resolve = () => {
      const user = getCurrentUser();
      if (user) {
        try {
          localStorage.setItem(ROLE_STORAGE_KEY, user.role);
        } catch {
          /* ignore */
        }
        setRoleState(user.role);
        setReady(true);
        return;
      }

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
    };

    resolve();
    const unsub = subscribeAuth(resolve);
    return () => unsub();
  }, [pathname]);

  const setRole = useCallback((next: UserRole) => {
    const signedIn = getCurrentUser();
    // Account role is fixed at registration. Switching cards must not turn a
    // teacher/parent into a student (that sent people back to the student home).
    if (signedIn) {
      setRoleState(signedIn.role);
      try {
        localStorage.setItem(ROLE_STORAGE_KEY, signedIn.role);
      } catch {
        /* ignore */
      }
      return;
    }
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
