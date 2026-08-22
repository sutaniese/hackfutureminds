"use client";

import { useCallback, useEffect, useState } from "react";
import { getRankedGrantsForOnboarding } from "@/lib/generate/deterministic";
import { formatGrantAmountLine } from "@/lib/format-grant";
import type { OnboardingAnswers } from "@/types/onboarding";

const ONBOARDING_KEY = "pathwise-onboarding-answers";

function readOnboarding(): OnboardingAnswers | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(ONBOARDING_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as unknown;
    if (!p || typeof p !== "object") return null;
    return p as OnboardingAnswers;
  } catch {
    return null;
  }
}

const matchStyles: Record<string, string> = {
  high: "text-emerald-800 bg-emerald-100",
  medium: "text-amber-900 bg-amber-100",
  low: "text-slate-700 bg-slate-200",
};

function MatchChip({ m }: { m: "low" | "medium" | "high" }) {
  const label =
    m === "high" ? "Strong match" : m === "medium" ? "Possible fit" : "Worth a look";
  return (
    <span
      className={`shrink-0 rounded-full px-2 py-1 text-xs font-bold ${matchStyles[m] ?? matchStyles.low}`}
    >
      {label}
    </span>
  );
}

export function GrantsListClient() {
  const [onboarding, setOnboarding] = useState<OnboardingAnswers | null>(null);
  const [ready, setReady] = useState(false);

  const sync = useCallback(() => {
    setOnboarding(readOnboarding());
  }, []);

  useEffect(() => {
    sync();
    setReady(true);
    const onVis = () => {
      if (document.visibilityState === "visible") sync();
    };
    window.addEventListener("focus", sync);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("focus", sync);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [sync]);

  const rows = getRankedGrantsForOnboarding(onboarding);

  if (!ready) {
    return (
      <div
        className="min-h-24 w-full max-w-sm animate-pulse rounded-2xl bg-[var(--pw-border)]/80"
        aria-hidden
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {!onboarding && (
        <p className="rounded-2xl border-2 border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
          <strong>Tip:</strong> finish{" "}
          <a className="font-medium underline" href="/onboarding">
            Onboarding
          </a>{" "}
          so we can order programmes by how well they match your city, focus,
          and study plans. Until then, you still see the full list (A–Z) with
          light labels.
        </p>
      )}

      {onboarding && (
        <p className="text-sm text-[var(--pw-muted)]" role="status">
          Scored with your profile ({rows.length} programmes in the database). Best
          matches are listed first.
        </p>
      )}

      <ol className="flex list-none flex-col gap-3 p-0">
        {rows.map((row) => {
          const { g, match } = row;
          return (
            <li
              key={g.id}
              className="pw-card flex flex-col gap-2 p-4 text-foreground"
            >
              <div className="flex min-h-12 items-start justify-between gap-2">
                <h2 className="text-base font-bold leading-tight text-foreground">
                  {g.name}
                </h2>
                {onboarding ? (
                  <MatchChip m={match} />
                ) : (
                  <span className="shrink-0 rounded-full bg-slate-100 px-2 py-1 text-xs font-bold text-slate-600">
                    Directory
                  </span>
                )}
              </div>
              <p className="text-sm text-[var(--pw-muted)]">
                {formatGrantAmountLine(g)} · <span className="whitespace-nowrap">Deadline: {g.deadline}</span>
              </p>
              <p className="text-sm leading-relaxed text-foreground">
                {g.kazakhstanRelevance}
              </p>
              <p className="text-xs text-[var(--pw-muted)]">
                <span className="font-semibold text-foreground/80">Why it might fit: </span>
                {g.suggestedMatchBlurb}
              </p>
              {g.eligibilityTags.length > 0 && (
                <div className="flex flex-wrap gap-1" aria-label="Eligibility tags">
                  {g.eligibilityTags.map((t) => (
                    <span
                      key={t}
                      className="rounded-md border border-[var(--pw-border)] bg-background/80 px-2 py-0.5 text-xs"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              )}
              <a
                className="pw-tap flex items-center justify-center self-start rounded-full border-2 border-[var(--pw-primary)] bg-[var(--pw-surface)] px-4 text-sm font-semibold text-[var(--pw-primary)]"
                href={g.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                Official website
              </a>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
