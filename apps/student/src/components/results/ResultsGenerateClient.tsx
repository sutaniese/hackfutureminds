"use client";

import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { buildGenerateRequest } from "@/lib/build-generate-request";
import { readLastGeneratePayload, writeLastGeneratePayload } from "@/lib/gamification";
import { ResultsGamificationBar } from "@/components/results/ResultsGamificationBar";
import { CrossAppPromo } from "@/components/results/CrossAppPromo";
import { useUserProgress } from "@/components/gamification/UserProgressProvider";
import { useI18n } from "@/i18n/I18nProvider";
import { readJsonResponse } from "@/lib/http-json";
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
  high: "border-[#d7d3ff] bg-[#f1efff] text-[#554dd6]",
  medium: "border-amber-300/40 bg-amber-300/15 text-amber-100",
  low: "border-slate-200 bg-white text-pathwise-muted",
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
  const { awardXp, earnBadge, setProfileCompletion } = useUserProgress();
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
      const json = await readJsonResponse<GenerateResponse>(res);
      if (!res.ok) {
        setError((json as { error?: string }).error || t("results.errApi", { e: String(res.status) }));
        return;
      }
      if (json && typeof json === "object" && "career_map" in (json as object)) {
        const out = json as GenerateResponse;
        setData(out);
        writeLastGeneratePayload(o, out);
        if (out.career_map.length > 0) {
          earnBadge("career_found");
          setProfileCompletion(55);
        }
        if (out.financial_route.grants.length > 0) {
          awardXp(50, "first_grant_match");
          earnBadge("grant_hunter");
          setProfileCompletion(70);
        }
        if (out.financial_route.coverage_percent >= 90) {
          earnBadge("fully_funded");
        }
        if (out.portfolio_block.trim().length > 0) {
          earnBadge("packaged");
          setProfileCompletion(85);
        }
        if (
          out.career_map.length > 0 &&
          out.financial_route &&
          out.portfolio_block.trim().length > 0
        ) {
          awardXp(100, "all_artifacts_generated");
          earnBadge("all_done");
          setProfileCompletion(90);
        }
        return;
      }
      setError(t("results.unexpected"));
    } catch (e) {
      setError(t("results.errApi", { e: e instanceof Error ? e.message : "network" }));
    } finally { setLoading(false); }
  }, [awardXp, earnBadge, locale, setProfileCompletion, t]);

  return (
    <div className="space-y-6">
      <ResultsGamificationBar onboarding={onboarding} data={data} />

      {restored && data && (
        <div className="rounded-2xl border border-[#6C63FF]/30 bg-[#6C63FF]/10 px-4 py-3 text-sm text-pathwise-accent-strong" role="status">
          {t("results.restored")}
        </div>
      )}

      {hasOnboarding ? (
        <p className="text-sm leading-relaxed text-pathwise-muted">{t("results.hint")}</p>
      ) : (
        <div className="rounded-2xl border border-amber-300/30 bg-amber-300/10 px-4 py-3 text-sm text-amber-100">
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
          <span className="pw-shimmer rounded-full px-3 py-1">
            {t("results.runLoading")}
          </span>
        ) : t("results.run")}
      </button>

      {error && (
        <div className="rounded-2xl border border-[#FF6B6B]/30 bg-[#FF6B6B]/10 px-4 py-3 text-sm text-red-100" role="alert">
          {error}
        </div>
      )}

      {data && (
        <div className="grid gap-5 xl:grid-cols-3" aria-label={t("results.ariaAll")}>
          {/* Career Map */}
          <section className="pw-slide-up pw-card overflow-hidden border-t-4 border-t-[#6C63FF]" style={{ animationDelay: "0ms" }}>
            <div className="px-5 py-4 text-white">
              <h2 className="flex items-center gap-2 text-lg font-bold">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="3 11 22 2 13 21 11 13 3 11" />
                </svg>
                {t("results.career")}
              </h2>
              <p className="mt-0.5 text-xs text-pathwise-muted">{t("results.careerSub")}</p>
            </div>
            <ul className="space-y-4 p-5 pt-0">
              {data.career_map.map((c, i) => (
                <li key={c.title} className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex flex-col gap-2">
                    <strong className="w-fit rounded-full bg-[#6C63FF]/20 px-3 py-1 text-sm text-white ring-1 ring-[#6C63FF]/30">{i + 1}. {c.title}</strong>
                    <span className="w-fit rounded-full bg-white px-3 py-1 text-xs font-bold text-[#6C63FF]">
                      {c.salary_kzt}
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-pathwise-muted">{c.description}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {c.vacancies?.slice(0, 2).map((v) => (
                      <a key={v.url} href={v.url} target="_blank" rel="noopener noreferrer" className="pw-chip px-3 py-1 text-[11px] font-semibold text-pathwise-accent-strong">
                        {v.company}
                      </a>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          </section>

          {/* Financial Route */}
          <section className="pw-slide-up pw-card overflow-hidden border-t-4 border-t-[#FF6B6B]" style={{ animationDelay: "0.1s" }}>
            <div className="px-5 py-4 text-white">
              <h2 className="flex items-center gap-2 text-lg font-bold">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
                </svg>
                {t("results.fin")}
              </h2>
            </div>
            <div className="p-5">
              <p className="text-sm text-foreground">
                <span className="text-pathwise-muted">{t("results.finNeed")} </span>
                <strong className="text-2xl">{data.financial_route.monthly_cost.toLocaleString()} KZT</strong>
              </p>
              <div className="mt-4" role="img" aria-label={`${t("results.gap")} ${data.financial_route.gap} ${data.financial_route.coverage_percent}`}>
                <div className="mb-1.5 flex justify-between text-xs font-semibold">
                  <span className="text-pathwise-muted">{t("results.gap")}</span>
                  <span className="text-[#6C63FF]">
                    {data.financial_route.gap.toLocaleString()} KZT · {data.financial_route.coverage_percent}%
                  </span>
                </div>
                <div className="h-4 w-full overflow-hidden rounded-full bg-[#FF6B6B]/20" aria-hidden>
                  <div
                    className="h-full rounded-full bg-[#6C63FF] shadow-sm transition-[width] duration-700"
                    style={{ width: `${Math.min(100, Math.max(0, data.financial_route.coverage_percent))}%` }}
                  />
                </div>
              </div>

              <h3 className="mt-5 text-sm font-bold text-foreground">{t("results.grantsTitle")}</h3>
              {data.financial_route.grants.length === 0 ? (
                <p className="mt-2 text-sm text-pathwise-muted">{t("results.noGrants")}</p>
              ) : (
                <ul className="mt-3 space-y-2.5" aria-label={t("results.grantsTitle")}>
                  {data.financial_route.grants.map((g, i) => (
                    <li
                      key={`${g.name}-${g.deadline}-${i}`}
                      className="pw-grant-unlock flex flex-col gap-1.5 rounded-2xl border border-slate-200 bg-white p-4 transition hover:bg-white"
                      style={{ animationDelay: `${i * 60}ms` } satisfies CSSProperties}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-sm font-bold text-foreground">{g.name}</span>
                        <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-bold ${matchColor[g.match] ?? matchColor.low}`}>
                          {matchLabel(t, g.match)}
                        </span>
                      </div>
                      <div className="text-xs text-pathwise-muted">
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
          <section className="pw-slide-up pw-card overflow-hidden border-t-4 border-t-[#6C63FF]" style={{ animationDelay: "0.2s" }}>
            <div className="px-5 py-4 text-white">
              <h2 className="flex items-center gap-2 text-lg font-bold">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
                </svg>
                {t("results.resume")}
              </h2>
            </div>
            <div className="p-5">
              <ul className="space-y-3">
                {data.portfolio_block.split(/\n+/).filter(Boolean).map((item, i) => (
                  <li
                    key={`${item}-${i}`}
                    className="pw-artifact-appear rounded-2xl border border-slate-200 bg-white p-4 text-sm leading-relaxed text-pathwise-muted"
                    style={{ animationDelay: `${i * 100}ms` } satisfies CSSProperties}
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <div className="xl:col-span-3">
            <CrossAppPromo />
          </div>
        </div>
      )}
    </div>
  );
}
