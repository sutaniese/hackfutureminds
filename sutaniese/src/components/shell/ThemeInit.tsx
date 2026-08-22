"use client";

import { useEffect } from "react";
import { LS_HIGH_CONTRAST } from "@/lib/pw-storage";

/**
 * Re-applies high-contrast class on load from localStorage to avoid flash.
 */
export function ThemeInit() {
  useEffect(() => {
    try {
      if (localStorage.getItem(LS_HIGH_CONTRAST) === "1") {
        document.documentElement.classList.add("high-contrast");
      }
    } catch {
      /* no localStorage in SSR or private mode */
    }
  }, []);
  return null;
}
