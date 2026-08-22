"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
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

  const pill = (on: boolean) =>
    `pw-tap flex min-h-12 min-w-0 max-w-[9rem] flex-1 items-center justify-center rounded-full px-3 text-xs font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pw-primary ${
      on
        ? "bg-pathwise-accent text-white shadow-pathwise"
        : "text-foreground ring-1 ring-pathwise-line bg-pathwise-surface/80 hover:bg-pathwise-accent-soft/60"
    }`;

  return (
    <header
      className="pw-pt-safe sticky top-0 z-30 border-b-2 border-pathwise-line bg-pathwise-surface/90 shadow-pathwise backdrop-blur"
      style={{ minHeight: "var(--pw-a11y-top)" }}
    >
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2 md:px-5">
        <Link
          href="/"
          className="flex min-h-12 min-w-12 shrink-0 items-center gap-2 no-underline"
        >
          <span
            className="pw-mark flex h-9 min-w-[2.25rem] items-center justify-center rounded-xl px-1.5 text-[12px] font-bold"
            aria-hidden
          >
            PW
          </span>
          <span className="text-sm font-semibold text-foreground">PathWise</span>
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
