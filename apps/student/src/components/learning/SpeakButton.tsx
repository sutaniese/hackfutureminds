"use client";

import { useCallback, useEffect, useState } from "react";
import { useI18n } from "@/i18n/I18nProvider";
import { isSpeechSupported, speakText, stopSpeaking } from "@/lib/speech";

/** Кнопка «прослушать»: озвучивает конспект или условие задания. */
export function SpeakButton({
  text,
  label,
  className = "",
}: {
  text: string;
  label?: string;
  className?: string;
}) {
  const { locale, t } = useI18n();
  const [supported, setSupported] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    setSupported(isSpeechSupported());
    return () => stopSpeaking();
  }, []);

  const toggle = useCallback(() => {
    if (speaking) {
      stopSpeaking();
      setSpeaking(false);
      return;
    }
    const clean = text.replace(/\s+/g, " ").trim();
    if (!clean) return;
    setSpeaking(true);
    speakText(clean, locale, () => setSpeaking(false));
  }, [locale, speaking, text]);

  if (!supported) return null;

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={speaking}
      className={`inline-flex min-h-10 items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 text-xs font-bold text-pathwise-ink transition hover:border-[#6C63FF]/50 ${className}`}
    >
      <span aria-hidden>
        {speaking ? (
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
            <rect x="6" y="5" width="4" height="14" rx="1" />
            <rect x="14" y="5" width="4" height="14" rx="1" />
          </svg>
        ) : (
          <svg
            viewBox="0 0 24 24"
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M11 5L6 9H3v6h3l5 4z" />
            <path d="M15.5 8.5a5 5 0 010 7" />
            <path d="M18.5 5.5a9 9 0 010 13" />
          </svg>
        )}
      </span>
      {speaking ? t("speak.stop") : label ?? t("speak.listen")}
    </button>
  );
}
