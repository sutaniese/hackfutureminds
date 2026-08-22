"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { TenWordmark } from "@/components/brand/TenWordmark";
import { SHELL_PX } from "@/lib/shell-layout";
import { useI18n } from "@/i18n/I18nProvider";
import { LS_HIGH_CONTRAST, LS_VOICE } from "@/lib/pw-storage";
import { LanguageSwitcher } from "./LanguageSwitcher";

export function A11yTopBar() {
  const { t } = useI18n();
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
        try { localStorage.setItem(LS_HIGH_CONTRAST, "1"); } catch { /* */ }
      } else {
        root.classList.remove("high-contrast");
        try { localStorage.removeItem(LS_HIGH_CONTRAST); } catch { /* */ }
      }
      return next;
    });
  }, []);

  const toggleVoice = useCallback(() => {
    setVoice((v) => {
      const next = !v;
      try {
        if (next) localStorage.setItem(LS_VOICE, "1");
        else localStorage.removeItem(LS_VOICE);
      } catch { /* */ }
      return next;
    });
  }, []);

  const pillCls = (on: boolean) =>
    `flex items-center justify-center rounded-xl px-3 py-2 text-xs font-semibold transition-all duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pw-primary ${
      on
        ? "bg-indigo-50 text-indigo-600 ring-1 ring-indigo-200 shadow-sm"
        : "text-pathwise-muted hover:text-foreground hover:bg-slate-50"
    }`;

  return (
    <header
      className="pw-pt-safe sticky top-0 z-30 border-b border-pathwise-line/40 bg-white/80 backdrop-blur-xl"
      style={{ minHeight: "var(--pw-a11y-top)" }}
    >
      <div className={`${SHELL_PX} flex items-center gap-3 py-3`}>
        <Link
          href="/"
          className="flex shrink-0 items-baseline no-underline"
          aria-label="teñ, home"
        >
          <TenWordmark size="md" presentational />
        </Link>

        <LanguageSwitcher />

        <div
          className="ml-auto flex items-center gap-1.5"
          role="group"
          aria-label={t("a11y.group")}
        >
          <button
            type="button"
            onClick={toggleContrast}
            aria-pressed={contrast}
            className={pillCls(contrast)}
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="mr-1 h-3.5 w-3.5" aria-hidden>
              <circle cx="10" cy="10" r="8" />
              <path d="M10 2a8 8 0 000 16V2z" fill="white" />
            </svg>
            {t("a11y.contrast")}
          </button>
          <button
            type="button"
            onClick={toggleVoice}
            aria-pressed={voice}
            className={pillCls(voice)}
            title={t("a11y.voiceTitle")}
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="mr-1 h-3.5 w-3.5" aria-hidden>
              <path d="M7 4a3 3 0 016 0v4a3 3 0 01-6 0V4zm3 10a5 5 0 005-5h-2a3 3 0 01-6 0H5a5 5 0 005 5zm-1 2v2h2v-2h-2z" />
            </svg>
            {t("a11y.voice")}
          </button>
          <Link
            href="/accessibility"
            className={`${pillCls(helpActive)} no-underline`}
            aria-current={helpActive ? "page" : undefined}
            aria-label={t("a11y.helpLabel")}
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="mr-1 h-3.5 w-3.5" aria-hidden>
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zM9 14a1 1 0 112 0 1 1 0 01-2 0z" clipRule="evenodd" />
            </svg>
            {t("a11y.help")}
          </Link>
        </div>
      </div>
    </header>
  );
}
