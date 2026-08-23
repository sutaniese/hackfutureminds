"use client";

import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { buildGenerateRequest } from "@/lib/build-generate-request";
import { readLastGeneratePayload, writeLastGeneratePayload } from "@/lib/gamification";
import { syncCurrentStudentProfile } from "@/lib/student-profile-store";
import { ResultsGamificationBar } from "@/components/results/ResultsGamificationBar";
import { CrossAppPromo } from "@/components/results/CrossAppPromo";
import { useUserProgress } from "@/components/gamification/UserProgressProvider";
import { useI18n } from "@/i18n/I18nProvider";
import { looksLikeHttpHtmlFailureMessage, readJsonResponse } from "@/lib/http-json";
import type { OnboardingAnswers } from "@/types/onboarding";
import type {
  GenerateResponse,
  MatchedGrantSummary,
  UniversityProgramRecommendation,
} from "@/types/generate";

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
  medium: "border-amber-300/50 bg-amber-100/60 text-amber-900",
  low: "border-slate-200 bg-white text-pathwise-muted",
};

function apiUrl(path: string) {
  return typeof window !== "undefined"
    ? new URL(path, window.location.origin).toString()
    : path;
}

function mapSubjectLabel(t: (k: string) => string, id: string): string {
  return t(`onboard.subjects.${id}` as "onboard.subjects.math");
}

function matchLabel(t: (k: string) => string, m: MatchedGrantSummary["match"]) {
  if (m === "high") return t("results.m.high");
  if (m === "medium") return t("results.m.medium");
  return t("results.m.low");
}

async function fetchProgramRecommendations(
  onboarding: OnboardingAnswers,
  language: "en" | "kk" | "ru",
  careerTitles: string[] = [],
): Promise<UniversityProgramRecommendation[]> {
  const res = await fetch(apiUrl("/api/recommend-programs"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ onboarding, language, careerTitles }),
  });
  const json = await readJsonResponse<{
    recommendations?: UniversityProgramRecommendation[];
  }>(res);
  if (!res.ok) return [];
  if (!json || !("recommendations" in json)) return [];
  return Array.isArray(json.recommendations) ? json.recommendations : [];
}

export function ResultsGenerateClient() {
  const { t, locale } = useI18n();
  const { awardXp, earnBadge, setProfileCompletion } = useUserProgress();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<GenerateResponse | null>(null);
  const [programRecommendations, setProgramRecommendations] = useState<
    UniversityProgramRecommendation[]
  >([]);
  const [onboarding, setOnboarding] = useState<OnboardingAnswers | null>(null);
  const [restored, setRestored] = useState(false);

  useEffect(() => {
    const o = readOnboarding();
    setOnboarding(o);
    if (o) {
      const r = readLastGeneratePayload(o);
      if (r) {
        setData(r);
        setRestored(true);
        syncCurrentStudentProfile({ onboarding: o, generated: r });
      }
      void fetchProgramRecommendations(
        o,
        locale,
        r?.career_map.map((item) => item.title) ?? [],
      ).then(setProgramRecommendations);
    }
  }, [locale]);

  const hasOnboarding = !!onboarding;

  const run = useCallback(async () => {
    const o = readOnboarding();
    setOnboarding(o);
    if (!o) { setError(t("results.errOnboard")); return; }
    setLoading(true);
    setError(null);
    setData(null);
    setProgramRecommendations([]);
    setRestored(false);
    const body = buildGenerateRequest(o, {
      language: locale,
      mapSubjectId: (id) => mapSubjectLabel(t, id),
    });
    try {
      const res = await fetch(apiUrl("/api/generate"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await readJsonResponse<GenerateResponse & { error?: string; hint?: string }>(res);
      if (!res.ok) {
        const apiMsg = (json as { error?: string }).error || "";
        setError(
          looksLikeHttpHtmlFailureMessage(apiMsg)
            ? t("results.errHtml")
            : apiMsg || t("results.errApi", { e: String(res.status) }),
        );
        return;
      }
      if (
        json &&
        typeof json === "object" &&
        "error" in (json as object) &&
        !("career_map" in (json as object))
      ) {
        const apiMsg = (json as { error?: string }).error || "";
        setError(
          looksLikeHttpHtmlFailureMessage(apiMsg)
            ? t("results.errHtml")
            : apiMsg || t("results.errApi", { e: "generate" }),
        );
        return;
      }
      if (json && typeof json === "object" && "career_map" in (json as object)) {
        const out = json as GenerateResponse;
        setData(out);
        writeLastGeneratePayload(o, out);
        syncCurrentStudentProfile({ onboarding: o, generated: out });
        const recommendations = await fetchProgramRecommendations(
          o,
          locale,
          out.career_map.map((item) => item.title),
        );
        setProgramRecommendations(recommendations);
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
      const msg = e instanceof Error ? e.message : "network";
      setError(
        looksLikeHttpHtmlFailureMessage(msg) ? t("results.errHtml") : t("results.errApi", { e: msg }),
      );
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
        <>
          <p className="text-sm leading-relaxed text-pathwise-muted">{t("results.hint")}</p>
          <button
            type="button"
            onClick={run}
            disabled={loading}
            className="pw-btn-primary pw-press w-full max-w-sm disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <span className="pw-shimmer rounded-full px-3 py-1">{t("results.runLoading")}</span>
            ) : (
              t("results.run")
            )}
          </button>
        </>
      ) : (
        /* Без анкеты план собрать нечем — объясняем это и ведём в анкету,
           вместо неактивной кнопки без причины. */
        <div className="pw-reveal rounded-[1.5rem] border border-dashed border-slate-300 bg-white p-8 text-center">
          <p className="text-base font-black text-pathwise-ink">План появится после анкеты</p>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-pathwise-muted">
            {t("results.noOnboard")} {t("results.andFinish")}
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <a href="/onboarding" className="pw-btn-primary pw-press text-sm no-underline">
              Заполнить анкету
            </a>
            <a href="/learning" className="pw-btn-secondary pw-press text-sm no-underline">
              Перейти к обучению
            </a>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-[#FF6B6B]/30 bg-[#FF6B6B]/10 px-4 py-3 text-sm font-semibold text-[#c63d3d]" role="alert">
          {error}
        </div>
      )}

      {data && (
        <div className="grid gap-5 xl:grid-cols-3" aria-label={t("results.ariaAll")}>
          {programRecommendations.length > 0 ? (
            <section className="pw-slide-up pw-card overflow-hidden border-t-4 border-t-[#6C63FF] xl:col-span-3">
              <div className="px-5 py-4">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-pathwise-accent-strong">
                  Подбор вузов
                </p>
                <h2 className="mt-2 text-xl font-black tracking-tight text-pathwise-ink">
Рекомендованные вузы и программы
                </h2>
                <p className="mt-1 text-sm leading-6 text-pathwise-muted">
Реальные данные вузов Казахстана, сопоставленные с вашим направлением, интересами, городом и бюджетом.
                </p>
              </div>
              <div className="grid gap-4 p-5 pt-0 md:grid-cols-2 xl:grid-cols-3">
                {programRecommendations.map((item) => (
                  <article
                    key={`${item.universityId}-${item.programTitle}`}
                    className="flex min-h-[24rem] flex-col rounded-3xl border border-slate-200 bg-white p-4 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-black text-pathwise-ink">
                          {item.programTitle}
                        </p>
                        <p className="mt-1 text-xs font-semibold text-pathwise-muted">
                          {item.universityName} · {item.city}
                        </p>
                      </div>
                      <span className="rounded-full bg-[#f1efff] px-2.5 py-1 text-xs font-black text-[#554dd6]">
                        {Math.round(item.fitScore)}%
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-bold text-slate-600">
                      {typeof item.rank === "number" ? (
                        <span className="rounded-full bg-[#6C63FF]/10 px-2.5 py-1 text-[#554dd6]">
                          Rank #{item.rank}
                        </span>
                      ) : null}
                      <span className="rounded-full bg-slate-100 px-2.5 py-1">
                        {item.language}
                      </span>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1">
                        {item.durationYears} years
                      </span>
                      {item.universityType ? (
                        <span className="rounded-full bg-slate-100 px-2.5 py-1">
                          {item.universityType}
                        </span>
                      ) : null}
                    </div>
                    {item.matchSummary ? (
                      <div className="mt-3 rounded-2xl border border-[#6C63FF]/15 bg-[#6C63FF]/5 p-3">
                        <p className="text-[11px] font-black uppercase tracking-[0.14em] text-pathwise-accent-strong">
                          Profession fit
                        </p>
                        <p className="mt-1 text-xs leading-5 text-slate-700">{item.matchSummary}</p>
                      </div>
                    ) : null}
                    <p className="mt-3 line-clamp-3 text-xs leading-5 text-pathwise-muted">
                      {item.description}
                    </p>
                    <div className="mt-3 grid gap-2 text-[11px] leading-5 text-slate-600">
                      {item.admissionDeadline ? (
                        <p>
                          <span className="font-black text-pathwise-ink">Deadline:</span> {item.admissionDeadline}
                        </p>
                      ) : null}
                      {item.languageRequirement ? (
                        <p>
                          <span className="font-black text-pathwise-ink">Language:</span> {item.languageRequirement}
                        </p>
                      ) : null}
                      {item.scholarships?.length ? (
                        <p>
                          <span className="font-black text-pathwise-ink">Scholarships:</span> {item.scholarships.slice(0, 2).join(", ")}
                        </p>
                      ) : null}
                    </div>
                    <ul className="mt-3 space-y-2 text-xs leading-5 text-slate-600">
                      {item.reasons.slice(0, 3).map((reason) => (
                        <li key={reason}>• {reason}</li>
                      ))}
                    </ul>
                    <ol className="mt-3 space-y-2 text-xs leading-5 text-pathwise-muted">
                      {item.nextSteps.slice(0, 3).map((step, index) => (
                        <li key={step}>
                          {index + 1}. {step}
                        </li>
                      ))}
                    </ol>
                    <div className="mt-auto pt-4">
                      {item.website ? (
                        <a
                          href={item.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-[#6C63FF] px-4 text-xs font-black text-white no-underline shadow-sm transition hover:bg-[#5B54D8]"
                        >
                          Official university site
                        </a>
                      ) : null}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ) : null}

          {/* Career Map */}
          <section className="pw-slide-up pw-card overflow-hidden border-t-4 border-t-[#6C63FF]" style={{ animationDelay: "0ms" }}>
            <div className="px-5 py-4">
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
                    <strong className="w-fit rounded-full bg-[#6C63FF]/10 px-3 py-1 text-sm font-black text-[#554dd6] ring-1 ring-[#6C63FF]/25">{i + 1}. {c.title}</strong>
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
            <div className="px-5 py-4">
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
            <div className="px-5 py-4">
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
