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
  } catch {
    return null;
  }
}

const matchColor: Record<string, string> = {
  high: "text-emerald-800 bg-emerald-100",
  medium: "text-amber-900 bg-amber-100",
  low: "text-slate-700 bg-slate-200",
};

function mapSubjectLabel(
  t: (k: string) => string,
  id: string,
): string {
  return t(`onboard.subjects.${id}` as "onboard.subjects.math");
}

function matchLabel(
  t: (k: string) => string,
  m: MatchedGrantSummary["match"],
) {
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
      if (r) {
        setData(r);
        setRestored(true);
      }
    }
  }, []);

  const hasOnboarding = !!onboarding;

  const run = useCallback(async () => {
    const o = readOnboarding();
    setOnboarding(o);
    if (!o) {
      setError(t("results.errOnboard"));
      return;
    }
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
      const json = (await res.json()) as
        | GenerateResponse
        | { error?: string }
        | unknown;
      if (!res.ok) {
        setError(
          (json as { error?: string }).error ||
            t("results.errApi", { e: String(res.status) }),
        );
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
      setError(
        t("results.errApi", {
          e: e instanceof Error ? e.message : "network",
        }),
      );
    } finally {
      setLoading(false);
    }
  }, [locale, t]);

  return (
    <div className="space-y-4">
      <ResultsGamificationBar onboarding={onboarding} data={data} />

      {restored && data && (
        <p
          className="rounded-2xl border-2 border-pathwise-line bg-pathwise-surface p-3 text-sm text-pathwise-muted"
          role="status"
        >
          {t("results.restored")}
        </p>
      )}

      {hasOnboarding ? (
        <p className="text-sm text-pathwise-muted">
          {t("results.hint")}
        </p>
      ) : (
        <p className="text-sm text-amber-800">
          {t("results.noOnboard")}{" "}
          <a className="font-medium underline" href="/onboarding">
            {t("nav.onboarding")}
          </a>{" "}
          {t("results.andFinish")}
        </p>
      )}

      <button
        type="button"
        onClick={run}
        disabled={loading || !hasOnboarding}
        className="min-h-12 w-full max-w-sm rounded-full bg-pw-primary px-4 text-sm font-semibold text-pw-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? t("results.runLoading") : t("results.run")}
      </button>

      {error && (
        <div
          className="rounded-2xl border-2 border-red-200 bg-red-50 p-3 text-sm text-red-900"
          role="alert"
        >
          {error}
        </div>
      )}

      {data && (
        <div className="space-y-4" aria-label={t("results.ariaAll")}>
          <section
            className="pw-card p-4 pw-artifact-appear"
            style={{ animationDelay: "0ms" }}
          >
            <h2 className="flex min-h-12 items-center gap-2 text-base font-bold">
              <span className="text-2xl" aria-hidden>
                🗺️
              </span>
              {t("results.career")}
            </h2>
            <p className="text-xs text-pathwise-muted">
              {t("results.careerSub")}
            </p>
            <ul className="mt-3 space-y-3 text-sm">
              {data.career_map.map((c, i) => (
                <li
                  key={c.title}
                  className="rounded-2xl border-2 border-pathwise-line bg-background/50 p-3"
                >
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
                    <strong className="text-foreground">
                      {i + 1}. {c.title}
                    </strong>
                    <span className="w-fit rounded-full border border-pathwise-line bg-pathwise-surface px-2 py-0.5 text-xs font-semibold text-pw-primary">
                      {c.salary_kzt}
                    </span>
                  </div>
                  <p className="mt-2 leading-relaxed text-foreground">
                    {c.description}
                  </p>
                </li>
              ))}
            </ul>
          </section>

          <section
            className="pw-card p-4 pw-artifact-appear"
            style={{ animationDelay: "0.1s" }}
          >
            <h2 className="flex min-h-12 items-center gap-2 text-base font-bold">
              <span className="text-2xl" aria-hidden>
                💰
              </span>
              {t("results.fin")}
            </h2>
            <p className="text-sm text-foreground">
              <span className="text-pathwise-muted">{t("results.finNeed")} </span>
              <strong>
                {data.financial_route.monthly_cost.toLocaleString()} KZT
              </strong>
            </p>
            <div
              className="mt-3"
              role="img"
              aria-label={`${t("results.gap")} ${data.financial_route.gap} ${data.financial_route.coverage_percent}`}
            >
              <div className="mb-1 flex justify-between text-xs font-medium text-pathwise-muted">
                <span>{t("results.gap")}</span>
                <span>
                  {data.financial_route.gap.toLocaleString()} KZT ·{" "}
                  {data.financial_route.coverage_percent}%
                </span>
              </div>
              <div
                className="h-3 w-full overflow-hidden rounded-full bg-pathwise-line"
                aria-hidden
              >
                <div
                  className="h-full rounded-full bg-emerald-600 transition-[width] duration-500"
                  style={{
                    width: `${Math.min(100, Math.max(0, data.financial_route.coverage_percent))}%`,
                  }}
                />
              </div>
            </div>

            <h3 className="mt-4 text-sm font-bold">{t("results.grantsTitle")}</h3>
            {data.financial_route.grants.length === 0 ? (
              <p className="mt-1 text-sm text-pathwise-muted">
                {t("results.noGrants")}
              </p>
            ) : (
              <ul className="mt-2 space-y-2" aria-label={t("results.grantsTitle")}>
                {data.financial_route.grants.map((g, i) => (
                  <li
                    key={`${g.name}-${g.deadline}-${i}`}
                    className="pw-grant-unlock flex flex-col gap-1 rounded-2xl border-2 border-dashed border-pw-primary/30 bg-pathwise-surface p-3"
                    style={{ animationDelay: `${i * 45}ms` } satisfies CSSProperties}
                  >
                    <div className="flex min-h-12 items-start justify-between gap-2">
                      <span className="font-semibold text-foreground">
                        {g.name}
                      </span>
                      <span
                        className={`shrink-0 rounded-full px-2 py-1 text-xs font-bold ${matchColor[g.match] ?? matchColor.low}`}
                      >
                        {matchLabel(t, g.match)}
                      </span>
                    </div>
                    <div className="text-xs text-pathwise-muted">
                      <span className="font-medium text-foreground">
                        {g.amount.toLocaleString()} KZT
                      </span>
                      {g.deadline ? ` · ${t("results.dead")}: ${g.deadline}` : null}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section
            className="pw-card p-4 pw-artifact-appear"
            style={{ animationDelay: "0.2s" }}
          >
            <h2 className="flex min-h-12 items-center gap-2 text-base font-bold">
              <span className="text-2xl" aria-hidden>
                📝
              </span>
              {t("results.resume")}
            </h2>
            <div className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
              {data.portfolio_block}
            </div>
          </section>

          <CrossAppPromo />
        </div>
      )}
    </div>
  );
}
