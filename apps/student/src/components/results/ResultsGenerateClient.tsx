"use client";

import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { buildGenerateRequest } from "@/lib/build-generate-request";
import { readLastGeneratePayload, writeLastGeneratePayload } from "@/lib/gamification";
import { ResultsGamificationBar } from "@/components/results/ResultsGamificationBar";
import { CrossAppPromo } from "@/components/results/CrossAppPromo";
import { useI18n } from "@/i18n/I18nProvider";
import type { OnboardingAnswers } from "@/types/onboarding";
import type { GenerateResponse, MatchedGrantSummary } from "@/types/generate";

const STORAGE = "pathwise-onboarding-answers";

function readOnboarding(): OnboardingAnswers | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORAGE);
    if (!raw) return null;
    const p = JSON.parse(raw) as unknown;
    if (!p || typeof p !== "object") return null;
    return p as OnboardingAnswers;
  } catch { return null; }
}

const matchColor: Record<string, string> = {
  high: "from-emerald-400 to-emerald-500 text-white",
  medium: "from-amber-400 to-orange-400 text-white",
  low: "from-slate-300 to-slate-400 text-white",
};

function mapSubjectLabel(t: (k: string) => string, id: string): string {
  return t(`onboard.subjects.${id}` as "onboard.subjects.math");
}

function matchLabel(t: (k: string) => string, m: MatchedGrantSummary["match"]) {
  if (m === "high") return t("results.m.high");
  if (m === "medium") return t("results.m.medium");
  return t("results.m.low");
}

export function ResultsGenerateClient() {
  const { t, locale } = useI18n();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<GenerateResponse | null>(null);
  const [onboarding, setOnboarding] = useState<OnboardingAnswers | null>(null);
  const [restored, setRestored] = useState(false);

  useEffect(() => {
    const o = readOnboarding();
    setOnboarding(o);
    if (o) {
      const r = readLastGeneratePayload(o);
      if (r) { setData(r); setRestored(true); }
    }
  }, []);

  const hasOnboarding = !!onboarding;

  const run = useCallback(async () => {
    const o = readOnboarding();
    setOnboarding(o);
    if (!o) { setError(t("results.errOnboard")); return; }
    setLoading(true);
    setError(null);
    setData(null);
    setRestored(false);
    const body = buildGenerateRequest(o, {
      language: locale,
      mapSubjectId: (id) => mapSubjectLabel(t, id),
    });
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await res.json()) as GenerateResponse | { error?: string } | unknown;
      if (!res.ok) {
        setError((json as { error?: string }).error || t("results.errApi", { e: String(res.status) }));
        return;
      }
      if (json && typeof json === "object" && "career_map" in (json as object)) {
        const out = json as GenerateResponse;
        setData(out);
        writeLastGeneratePayload(o, out);
        return;
      }
      setError(t("results.unexpected"));
    } catch (e) {
      setError(t("results.errApi", { e: e instanceof Error ? e.message : "network" }));
    } finally { setLoading(false); }
  }, [locale, t]);

  return (
    <div className="space-y-5">
      <ResultsGamificationBar onboarding={onboarding} data={data} />

      {restored && data && (
        <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 px-4 py-3 text-sm text-indigo-700" role="status">
          {t("results.restored")}
        </div>
      )}

      {hasOnboarding ? (
        <p className="text-sm leading-relaxed text-slate-500">{t("results.hint")}</p>
      ) : (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {t("results.noOnboard")}{" "}
          <a className="font-semibold underline" href="/onboarding">{t("nav.onboarding")}</a>{" "}
          {t("results.andFinish")}
        </div>
      )}

      <button
        type="button"
        onClick={run}
        disabled={loading || !hasOnboarding}
        className="pw-btn-primary w-full max-w-sm disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            {t("results.runLoading")}
          </span>
        ) : t("results.run")}
      </button>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          {error}
        </div>
      )}

      {data && (
        <div className="space-y-5" aria-label={t("results.ariaAll")}>
          {/* Career Map */}
          <section className="pw-slide-up overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm" style={{ animationDelay: "0ms" }}>
            <div className="bg-gradient-to-r from-indigo-500 to-violet-500 px-5 py-4 text-white">
              <h2 className="flex items-center gap-2 text-base font-bold">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="3 11 22 2 13 21 11 13 3 11" />
                </svg>
                {t("results.career")}
              </h2>
              <p className="mt-0.5 text-xs text-white/70">{t("results.careerSub")}</p>
            </div>
            <ul className="divide-y divide-slate-50 p-5">
              {data.career_map.map((c, i) => (
                <li key={c.title} className="py-4 first:pt-0 last:pb-0">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
                    <strong className="text-foreground">{i + 1}. {c.title}</strong>
                    <span className="w-fit rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-600">
                      {c.salary_kzt}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-slate-500">{c.description}</p>
                </li>
              ))}
            </ul>
          </section>

          {/* Financial Route */}
          <section className="pw-slide-up overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm" style={{ animationDelay: "0.1s" }}>
            <div className="bg-gradient-to-r from-emerald-500 to-teal-500 px-5 py-4 text-white">
              <h2 className="flex items-center gap-2 text-base font-bold">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
                </svg>
                {t("results.fin")}
              </h2>
            </div>
            <div className="p-5">
              <p className="text-sm text-foreground">
                <span className="text-slate-400">{t("results.finNeed")} </span>
                <strong className="text-lg">{data.financial_route.monthly_cost.toLocaleString()} KZT</strong>
              </p>
              <div className="mt-4" role="img" aria-label={`${t("results.gap")} ${data.financial_route.gap} ${data.financial_route.coverage_percent}`}>
                <div className="mb-1.5 flex justify-between text-xs font-semibold">
                  <span className="text-slate-400">{t("results.gap")}</span>
                  <span className="text-emerald-600">
                    {data.financial_route.gap.toLocaleString()} KZT · {data.financial_route.coverage_percent}%
                  </span>
                </div>
                <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100" aria-hidden>
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-400 shadow-sm shadow-emerald-500/30 transition-[width] duration-700"
                    style={{ width: `${Math.min(100, Math.max(0, data.financial_route.coverage_percent))}%` }}
                  />
                </div>
              </div>

              <h3 className="mt-5 text-sm font-bold text-foreground">{t("results.grantsTitle")}</h3>
              {data.financial_route.grants.length === 0 ? (
                <p className="mt-2 text-sm text-slate-400">{t("results.noGrants")}</p>
              ) : (
                <ul className="mt-3 space-y-2.5" aria-label={t("results.grantsTitle")}>
                  {data.financial_route.grants.map((g, i) => (
                    <li
                      key={`${g.name}-${g.deadline}-${i}`}
                      className="pw-grant-unlock flex flex-col gap-1.5 rounded-xl border border-slate-100 bg-slate-50/50 p-4 transition hover:shadow-sm"
                      style={{ animationDelay: `${i * 60}ms` } satisfies CSSProperties}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-sm font-bold text-foreground">{g.name}</span>
                        <span className={`shrink-0 rounded-lg bg-gradient-to-r px-2.5 py-1 text-[11px] font-bold ${matchColor[g.match] ?? matchColor.low}`}>
                          {matchLabel(t, g.match)}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500">
                        <span className="font-semibold text-foreground">{g.amount.toLocaleString()} KZT</span>
                        {g.deadline ? ` · ${t("results.dead")}: ${g.deadline}` : null}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          {/* Resume */}
          <section className="pw-slide-up overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm" style={{ animationDelay: "0.2s" }}>
            <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-5 py-4 text-white">
              <h2 className="flex items-center gap-2 text-base font-bold">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
                </svg>
                {t("results.resume")}
              </h2>
            </div>
            <div className="p-5">
              <div className="whitespace-pre-wrap text-sm leading-relaxed text-slate-600">
                {data.portfolio_block}
              </div>
            </div>
          </section>

          <CrossAppPromo />
        </div>
      )}
    </div>
  );
}
