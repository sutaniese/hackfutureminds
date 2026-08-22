"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { TenWordmark } from "@/components/brand/TenWordmark";
import { SHELL_PX } from "@/lib/shell-layout";
import { LS_HIGH_CONTRAST, LS_VOICE } from "@/lib/pw-storage";

export function A11yTopBar() {
  const pathname = usePathname() || "/";
  const [contrast, setContrast] = useState(false);
  const [voice, setVoice] = useState(false);
  const helpActive = pathname.startsWith("/accessibility");

  useEffect(() => {
    try {
      setContrast(localStorage.getItem(LS_HIGH_CONTRAST) === "1");
      setVoice(localStorage.getItem(LS_VOICE) === "1");
    } catch {
      /* ignore */
    }
  }, []);

  const toggleContrast = useCallback(() => {
    setContrast((c) => {
      const next = !c;
      const root = document.documentElement;
      if (next) {
        root.classList.add("high-contrast");
        try {
          localStorage.setItem(LS_HIGH_CONTRAST, "1");
        } catch {
          /* ignore */
        }
      } else {
        root.classList.remove("high-contrast");
        try {
          localStorage.removeItem(LS_HIGH_CONTRAST);
        } catch {
          /* ignore */
        }
      }
      return next;
    });
  }, []);

  const toggleVoice = useCallback(() => {
    setVoice((v) => {
      const next = !v;
      try {
        if (next) {
          localStorage.setItem(LS_VOICE, "1");
        } else {
          localStorage.removeItem(LS_VOICE);
        }
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  /* Active pill = hackhack / front mock: light fill + 1px ring in primary + blue type */
  const pill = (on: boolean) =>
    `pw-tap flex min-h-12 min-w-0 max-w-[9rem] flex-1 items-center justify-center rounded-full px-3 text-xs font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pw-primary ${
      on
        ? "bg-pathwise-accent-soft/95 text-pw-primary ring-1 ring-pathwise-accent"
        : "text-foreground ring-1 ring-pathwise-line bg-pathwise-surface/80 hover:bg-pathwise-accent-soft/60"
    }`;

  return (
    <header
      className="pw-pt-safe sticky top-0 z-30 border-b border-pathwise-line bg-pathwise-surface/95 shadow-[0_1px_2px_rgb(15_23_42/0.05)] backdrop-blur-sm"
      style={{ minHeight: "var(--pw-a11y-top)" }}
    >
      <div
        className={`${SHELL_PX} flex flex-wrap items-center gap-x-3 gap-y-2 py-2.5`}
      >
        <Link
          href="/"
          className="flex min-h-12 min-w-12 shrink-0 items-baseline no-underline"
          aria-label="teñ, home"
        >
          <TenWordmark size="md" presentational />
        </Link>
        <div
          className="ml-auto flex min-w-0 flex-1 flex-wrap items-center justify-end gap-1"
          role="group"
          aria-label="Accessibility options"
        >
          <span className="sr-only">Accessibility options</span>
          <button
            type="button"
            onClick={toggleContrast}
            aria-pressed={contrast}
            className={pill(contrast)}
          >
            Contrast
          </button>
          <button
            type="button"
            onClick={toggleVoice}
            aria-pressed={voice}
            className={pill(voice)}
            title="Prefers voice mode; full flow comes later"
          >
            Voice
          </button>
          <Link
            href="/accessibility"
            className={`${pill(helpActive)} no-underline`}
            aria-current={helpActive ? "page" : undefined}
            aria-label="Accessibility help and options"
          >
            Help
          </Link>
        </div>
      </div>
    </header>
  );
}
