"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { useI18n } from "@/i18n/I18nProvider";

/** Demo profile — static content for `/profile/example`. */
const DEMO = {
  name: "Sultan Yessengeldi",
  age: 17,
  subjects: "Math + physics",
} as const;

export function ExampleProfileView() {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);

  const pageUrl = useMemo(() => {
    if (typeof window === "undefined") return "/profile/example";
    return `${window.location.origin}/profile/example`;
  }, []);

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(pageUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }, [pageUrl]);

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <header className="space-y-3">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-pathwise-accent-strong">
          {t("profile.example.kicker")}
        </p>
        <h1 className="text-3xl font-black tracking-tight text-pathwise-ink">{DEMO.name}</h1>
        <p
          className="inline-flex rounded-full bg-amber-300/20 px-3 py-1 text-xs font-bold text-amber-950 ring-1 ring-amber-400/50"
          role="note"
        >
          {t("profile.example.pill")}
        </p>
        <p className="max-w-xl text-sm leading-relaxed text-pathwise-muted">{t("profile.example.note")}</p>
      </header>

      <section
        className="pw-card space-y-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
        aria-label={t("profile.example.kicker")}
      >
        <dl className="grid gap-5 text-sm">
          <div>
            <dt className="text-xs font-black uppercase tracking-[0.14em] text-pathwise-muted">
              {t("profile.example.fullName")}
            </dt>
            <dd className="mt-1.5 text-lg font-black text-pathwise-ink">{DEMO.name}</dd>
          </div>
          <div>
            <dt className="text-xs font-black uppercase tracking-[0.14em] text-pathwise-muted">
              {t("profile.age")}
            </dt>
            <dd className="mt-1.5 text-xl font-black tabular-nums text-pathwise-ink">{DEMO.age}</dd>
          </div>
          <div>
            <dt className="text-xs font-black uppercase tracking-[0.14em] text-pathwise-muted">
              {t("profile.subjects")}
            </dt>
            <dd className="mt-1.5 text-pathwise-ink">{DEMO.subjects}</dd>
          </div>
        </dl>

        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 p-4">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-pathwise-muted">
            {t("profile.example.urlLabel")}
          </p>
          <p className="mt-2 break-all font-mono text-xs text-pathwise-ink">{pageUrl}</p>
          <button
            type="button"
            onClick={() => void copy()}
            className="mt-3 inline-flex min-h-10 items-center justify-center rounded-full border border-slate-200 bg-white px-4 text-xs font-bold text-pathwise-ink transition hover:border-[#6C63FF]/40"
          >
            {copied ? t("profile.copied") : t("profile.copyUrl")}
          </button>
        </div>
      </section>

      <div className="flex flex-wrap gap-2">
        <Link
          href="/onboarding"
          className="pw-btn-primary inline-flex min-h-11 items-center justify-center rounded-full px-5 text-sm font-bold no-underline"
        >
          {t("profile.toOnboarding")}
        </Link>
        <Link
          href="/results"
          className="pw-secondary-btn inline-flex min-h-11 items-center justify-center rounded-full px-5 text-sm font-bold no-underline"
        >
          {t("profile.toResults")}
        </Link>
      </div>
    </div>
  );
}
