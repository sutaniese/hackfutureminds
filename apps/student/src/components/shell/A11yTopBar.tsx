"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { TenWordmark } from "@/components/brand/TenWordmark";
import { SHELL_PX } from "@/lib/shell-layout";
import { useI18n } from "@/i18n/I18nProvider";
import { LS_HIGH_CONTRAST, LS_VOICE } from "@/lib/pw-storage";
import { ROLE_ENTRY_PATHS } from "@/lib/site-nav";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { useAuth } from "./useAuth";

export function A11yTopBar() {
  const { t } = useI18n();
  const pathname = usePathname() || "/";
  const { user, status, logout } = useAuth();
  const showSessionActions = !user || user.role === "student";
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
    const next = !voice;
    setVoice(next);
    try {
      if (next) localStorage.setItem(LS_VOICE, "1");
      else localStorage.removeItem(LS_VOICE);
      window.setTimeout(() => {
        window.dispatchEvent(new Event("pathwise:voice-toggle"));
      }, 0);
    } catch { /* */ }
  }, [voice]);

  const pillCls = (on: boolean) =>
    `group relative flex min-h-12 min-w-12 items-center justify-center rounded-full px-3 py-2 text-xs font-semibold transition-all duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pw-primary ${
      on
        ? "bg-[#6C63FF] text-white shadow-sm"
        : "border border-slate-200 bg-white text-pathwise-muted hover:bg-slate-50 hover:text-slate-900"
    }`;

  return (
    <header
      className="pw-pt-safe relative z-30 border-b border-pathwise-line/70 bg-white/95"
      style={{ minHeight: "var(--pw-a11y-top)" }}
    >
      <div className={`${SHELL_PX} flex flex-wrap items-center gap-3 py-2.5`}>
        <Link
          href="/"
          className="flex shrink-0 items-baseline no-underline"
          aria-label="teñ, home"
        >
          <TenWordmark size="md" presentational />
        </Link>

        <LanguageSwitcher />

        <div
          className="ml-auto flex max-w-full items-center gap-1.5 overflow-x-auto"
          role="group"
          aria-label={t("a11y.group")}
        >
          <button
            type="button"
            onClick={toggleContrast}
            aria-pressed={contrast}
            className={pillCls(contrast)}
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden>
              <circle cx="10" cy="10" r="8" />
              <path d="M10 2a8 8 0 000 16V2z" fill="white" />
            </svg>
            <span className="sr-only">{t("a11y.contrast")}</span>
            <span className="pointer-events-none absolute top-full mt-2 hidden rounded-lg bg-slate-900 px-2 py-1 text-[11px] text-white group-hover:block">{t("a11y.contrast")}</span>
          </button>
          <button
            type="button"
            onClick={toggleVoice}
            aria-pressed={voice}
            className={pillCls(voice)}
            title={t("a11y.voiceTitle")}
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden>
              <path d="M7 4a3 3 0 016 0v4a3 3 0 01-6 0V4zm3 10a5 5 0 005-5h-2a3 3 0 01-6 0H5a5 5 0 005 5zm-1 2v2h2v-2h-2z" />
            </svg>
            <span className="sr-only">{t("a11y.voice")}</span>
            <span className="pointer-events-none absolute top-full mt-2 hidden rounded-lg bg-slate-900 px-2 py-1 text-[11px] text-white group-hover:block">{t("a11y.voice")}</span>
          </button>
          <Link
            href="/accessibility"
            className={`${pillCls(helpActive)} no-underline`}
            aria-current={helpActive ? "page" : undefined}
            aria-label={t("a11y.helpLabel")}
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden>
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zM9 14a1 1 0 112 0 1 1 0 01-2 0z" clipRule="evenodd" />
            </svg>
            <span className="sr-only">{t("a11y.help")}</span>
            <span className="pointer-events-none absolute top-full mt-2 hidden rounded-lg bg-slate-900 px-2 py-1 text-[11px] text-white group-hover:block">{t("a11y.help")}</span>
          </Link>
          {showSessionActions && status === "authed" && user ? (
            <>
              <Link
                href={ROLE_ENTRY_PATHS[user.role]}
                className="inline-flex min-h-12 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-pathwise-muted no-underline hover:bg-slate-50 hover:text-slate-900"
              >
                Кабинет
              </Link>
              <button
                type="button"
                onClick={logout}
                className="inline-flex min-h-12 shrink-0 items-center justify-center rounded-full bg-[#6C63FF] px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-[#5b53e6]"
              >
                Выйти
              </button>
            </>
          ) : showSessionActions && status === "guest" ? (
            <>
              <Link
                href="/login"
                className="inline-flex min-h-12 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-foreground no-underline hover:bg-slate-50"
              >
                Войти
              </Link>
              <Link
                href="/register"
                className="inline-flex min-h-12 shrink-0 items-center justify-center rounded-full bg-[#6C63FF] px-3 py-2 text-xs font-semibold text-white no-underline shadow-sm hover:bg-[#5b53e6]"
              >
                Регистрация
              </Link>
            </>
          ) : null}
        </div>
      </div>
    </header>
  );
}
