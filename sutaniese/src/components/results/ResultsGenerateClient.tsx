"use client";

import { useCallback, useEffect, useState } from "react";
import { buildGenerateRequest } from "@/lib/build-generate-request";
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

export function ResultsGenerateClient() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<GenerateResponse | null>(null);
  const [hasOnboarding, setHasOnboarding] = useState(false);

  useEffect(() => {
    setHasOnboarding(!!readOnboarding());
  }, []);

  const run = useCallback(async () => {
    const o = readOnboarding();
    if (!o) {
      setHasOnboarding(false);
      setError("No onboarding data. Finish the flow in Onboarding first.");
      return;
    }
    setHasOnboarding(true);
    setLoading(true);
    setError(null);
    setData(null);
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
        setData(json as GenerateResponse);
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
      {hasOnboarding ? (
        <p className="text-sm text-[var(--pw-muted)]">
          Onboarding data found. Tap generate to call{" "}
          <code className="rounded bg-black/5 px-1 text-xs">/api/generate</code>{" "}
          (uses Groq when <code className="text-xs">GROQ_API_KEY</code> is set
          in <code className="text-xs">.env.local</code>, then the local engine
          on failure).
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
        {loading ? "Generating…" : "Run generation (API)"}
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
        <div className="space-y-3">
          <section className="pw-card p-4" aria-label="Career map">
            <h2 className="text-base font-bold">Career map (3)</h2>
            <ul className="mt-2 space-y-2 text-sm">
              {data.career_map.map((c) => (
                <li key={c.title}>
                  <strong className="text-foreground">{c.title}</strong> —{" "}
                  <span className="text-[var(--pw-muted)]">{c.salary_kzt}</span>
                  <p className="mt-1 text-foreground">{c.description}</p>
                </li>
              ))}
            </ul>
          </section>
          <section className="pw-card p-4" aria-label="Financial route">
            <h2 className="text-base font-bold">Financial route</h2>
            <p className="mt-1 text-sm text-foreground">
              Monthly need (demo): {data.financial_route.monthly_cost.toLocaleString()}{" "}
              KZT
            </p>
            <p className="text-sm text-foreground">
              Gap: {data.financial_route.gap.toLocaleString()} KZT · Cover:{" "}
              {data.financial_route.coverage_percent}%
            </p>
            <ul className="mt-2 space-y-1 text-sm">
              {data.financial_route.grants.map((g) => (
                <li key={g.name + g.deadline}>
                  {g.name} — {g.amount.toLocaleString()} KZT (match: {g.match})
                </li>
              ))}
            </ul>
          </section>
          <section className="pw-card p-4" aria-label="Resume block">
            <h2 className="text-base font-bold">Resume block</h2>
            <p className="mt-2 text-sm text-foreground">{data.portfolio_block}</p>
          </section>
        </div>
      )}
    </div>
  );
}
