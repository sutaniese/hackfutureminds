"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { LS_HIGH_CONTRAST, LS_VOICE } from "@/lib/pw-storage";

export function A11yTopBar() {
  const [contrast, setContrast] = useState(false);
  const [voice, setVoice] = useState(false);

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

  return (
    <div
      className="pw-pt-safe sticky top-0 z-30 border-b border-[var(--pw-border)] bg-[var(--pw-surface)]/95 backdrop-blur"
      style={{ minHeight: "var(--pw-a11y-top)" }}
    >
      <div className="mx-auto flex max-w-md items-center justify-between gap-2 px-2 py-1.5">
        <span className="text-xs font-medium text-[var(--pw-muted)]">
          Access
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={toggleContrast}
            aria-pressed={contrast}
            className="pw-tap flex min-h-12 min-w-12 max-w-[9rem] flex-1 items-center justify-center rounded-full border-2 border-[var(--pw-border)] bg-[var(--pw-surface)] px-3 text-xs font-semibold text-foreground transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pw-primary)]"
          >
            Contrast
          </button>
          <button
            type="button"
            onClick={toggleVoice}
            aria-pressed={voice}
            className="pw-tap flex min-h-12 min-w-12 max-w-[9rem] flex-1 items-center justify-center rounded-full border-2 border-[var(--pw-border)] bg-[var(--pw-surface)] px-3 text-xs font-semibold text-foreground transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pw-primary)]"
            title="Prefers voice mode; full flow comes later"
          >
            Voice
          </button>
          <Link
            href="/accessibility"
            className="pw-tap flex min-w-12 items-center justify-center rounded-full border-2 border-[var(--pw-border)] bg-[var(--pw-surface)] px-3 text-xs font-semibold text-foreground no-underline transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pw-primary)]"
            aria-label="Accessibility help and options"
          >
            Help
          </Link>
        </div>
      </div>
    </div>
  );
}
