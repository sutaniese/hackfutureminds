"use client";

import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { buildGenerateRequest } from "@/lib/build-generate-request";
import { readLastGeneratePayload, writeLastGeneratePayload } from "@/lib/gamification";
import { ResultsGamificationBar } from "@/components/results/ResultsGamificationBar";
import type { OnboardingAnswers } from "@/types/onboarding";
import type { GenerateResponse } from "@/types/generate";

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

export function ResultsGenerateClient() {
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
      setError("No onboarding data. Finish the flow in Onboarding first.");
      return;
    }
    setLoading(true);
    setError(null);
    setData(null);
    setRestored(false);
    const body = buildGenerateRequest(o, { language: "en" });
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
          (json as { error?: string }).error || `Request failed (${res.status})`
        );
        return;
      }
      if (json && typeof json === "object" && "career_map" in (json as object)) {
        const out = json as GenerateResponse;
        setData(out);
        writeLastGeneratePayload(o, out);
        return;
      }
      setError("Unexpected response shape from /api/generate");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <div className="space-y-4">
      <ResultsGamificationBar onboarding={onboarding} data={data} />

      {restored && data && (
        <p
          className="rounded-2xl border-2 border-[var(--pw-border)] bg-[var(--pw-surface)] p-3 text-sm text-[var(--pw-muted)]"
          role="status"
        >
          Showing your last result for this profile. Regenerate below for a
          fresh plan.
        </p>
      )}

      {hasOnboarding ? (
        <p className="text-sm text-[var(--pw-muted)]">
          Onboarding data found.{" "}
          <code className="rounded bg-black/5 px-1 text-xs">/api/generate</code>{" "}
          uses Groq when <code className="text-xs">GROQ_API_KEY</code> is set; otherwise
          the built-in engine.
        </p>
      ) : (
        <p className="text-sm text-amber-800">
          No saved onboarding yet. Open{" "}
          <a className="font-medium underline" href="/onboarding">
            Onboarding
          </a>{" "}
          and tap <strong>Finish</strong> first.
        </p>
      )}

      <button
        type="button"
        onClick={run}
        disabled={loading || !hasOnboarding}
        className="min-h-12 w-full max-w-sm rounded-full bg-[var(--pw-primary)] px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? "Generating…" : "Regenerate your plan"}
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
        <div className="space-y-4" aria-label="Your personalized results">
          <section
            className="pw-card p-4 pw-artifact-appear"
            style={{ animationDelay: "0ms" }}
            aria-label="Career map"
          >
            <h2 className="flex min-h-12 items-center gap-2 text-base font-bold">
              <span className="text-2xl" aria-hidden>
                🗺️
              </span>
              Career map
            </h2>
            <p className="text-xs text-[var(--pw-muted)]">
              Three direction ideas with typical salary bands in Kazakhstan.
            </p>
            <ul className="mt-3 space-y-3 text-sm">
              {data.career_map.map((c, i) => (
                <li
                  key={c.title}
                  className="rounded-2xl border-2 border-[var(--pw-border)] bg-background/50 p-3"
                >
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
                    <strong className="text-foreground">
                      {i + 1}. {c.title}
                    </strong>
                    <span className="w-fit rounded-full border border-[var(--pw-border)] bg-[var(--pw-surface)] px-2 py-0.5 text-xs font-semibold text-[var(--pw-primary)]">
                      {c.salary_kzt}
                    </span>
                  </div>
                  <p className="mt-2 text-foreground leading-relaxed">
                    {c.description}
                  </p>
                </li>
              ))}
            </ul>
          </section>

          <section
            className="pw-card p-4 pw-artifact-appear"
            style={{ animationDelay: "0.1s" }}
            aria-label="Financial route"
          >
            <h2 className="flex min-h-12 items-center gap-2 text-base font-bold">
              <span className="text-2xl" aria-hidden>
                💰
              </span>
              Financial route
            </h2>
            <p className="text-sm text-foreground">
              <span className="text-[var(--pw-muted)]">Est. monthly need: </span>
              <strong>
                {data.financial_route.monthly_cost.toLocaleString()} KZT
              </strong>
            </p>
            <div
              className="mt-3"
              role="img"
              aria-label={`Gap ${data.financial_route.gap.toLocaleString()} KZT, coverage ${data.financial_route.coverage_percent} percent`}
            >
              <div className="mb-1 flex justify-between text-xs font-medium text-[var(--pw-muted)]">
                <span>Gap to cover</span>
                <span>
                  {data.financial_route.gap.toLocaleString()} KZT ·{" "}
                  {data.financial_route.coverage_percent}%
                </span>
              </div>
              <div
                className="h-3 w-full overflow-hidden rounded-full bg-[var(--pw-border)]"
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

            <h3 className="mt-4 text-sm font-bold">Matched grants</h3>
            {data.financial_route.grants.length === 0 ? (
              <p className="mt-1 text-sm text-[var(--pw-muted)]">
                No program matches in this run — try adjusting subjects or
                city in onboarding.
              </p>
            ) : (
              <ul className="mt-2 space-y-2" aria-label="Grant matches">
                {data.financial_route.grants.map((g, i) => (
                  <li
                    key={`${g.name}-${g.deadline}-${i}`}
                    className="pw-grant-unlock flex flex-col gap-1 rounded-2xl border-2 border-dashed border-[var(--pw-primary)]/30 bg-[var(--pw-surface)] p-3"
                    style={{ animationDelay: `${i * 45}ms` } satisfies CSSProperties}
                  >
                    <div className="flex min-h-12 items-start justify-between gap-2">
                      <span className="font-semibold text-foreground">
                        {g.name}
                      </span>
                      <span
                        className={`shrink-0 rounded-full px-2 py-1 text-xs font-bold ${matchColor[g.match] ?? matchColor.low}`}
                      >
                        {g.match} match
                      </span>
                    </div>
                    <div className="text-xs text-[var(--pw-muted)]">
                      <span className="text-foreground font-medium">
                        {g.amount.toLocaleString()} KZT
                      </span>
                      {g.deadline ? ` · deadline: ${g.deadline}` : null}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section
            className="pw-card p-4 pw-artifact-appear"
            style={{ animationDelay: "0.2s" }}
            aria-label="Resume block"
          >
            <h2 className="flex min-h-12 items-center gap-2 text-base font-bold">
              <span className="text-2xl" aria-hidden>
                📝
              </span>
              Resume-ready statements
            </h2>
            <div className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
              {data.portfolio_block}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
