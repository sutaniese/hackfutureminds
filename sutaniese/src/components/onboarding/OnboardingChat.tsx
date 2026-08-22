"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  ONBOARDING_COPY,
  ONBOARDING_QUESTION_KEYS,
  ONBOARDING_SUBJECT_OPTIONS,
  WORK_OPTIONS,
} from "@/lib/onboarding-constants";
import type { OnboardingAnswers, WorkPreference } from "@/types/onboarding";
import { TOTAL_ONBOARDING_STEPS, createEmptyAnswers } from "@/types/onboarding";
import { OnboardingProgress } from "./OnboardingProgress";

const STORAGE_KEY = "pathwise-onboarding-answers";

function isStepSatisfied(step: number, a: OnboardingAnswers): boolean {
  switch (step) {
    case 0:
      return a.subjectIds.length > 0;
    case 1:
      return a.freeTime.trim().length > 0;
    case 2:
      return a.achievements.trim().length > 0;
    case 3:
      return a.workPreference != null;
    case 4:
      return a.studyLocation != null;
    case 5:
      return a.city.trim().length > 0;
    case 6:
      return true;
    default:
      return false;
  }
}

function toggleSubjectId(prev: string[], id: string): string[] {
  if (prev.includes(id)) {
    return prev.filter((s) => s !== id);
  }
  return [...prev, id];
}

export function OnboardingChat() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<OnboardingAnswers>(() =>
    createEmptyAnswers()
  );
  const [complete, setComplete] = useState(false);

  const canNext = isStepSatisfied(step, answers);
  const isLast = step === TOTAL_ONBOARDING_STEPS - 1;
  const question = ONBOARDING_COPY[ONBOARDING_QUESTION_KEYS[step]];

  const goBack = useCallback(() => {
    if (step > 0) setStep((s) => s - 1);
  }, [step]);

  const goNext = useCallback(() => {
    if (!isStepSatisfied(step, answers)) return;
    if (isLast) {
      setComplete(true);
    } else {
      setStep((s) => s + 1);
    }
  }, [step, answers, isLast]);

  useEffect(() => {
    if (complete) {
      try {
        const payload = JSON.stringify(answers);
        sessionStorage.setItem(STORAGE_KEY, payload);
      } catch {
        /* no storage */
      }
    }
  }, [complete, answers]);

  const reset = useCallback(() => {
    setComplete(false);
    setStep(0);
    setAnswers(createEmptyAnswers());
  }, []);

  if (complete) {
    return (
      <div className="space-y-4">
        <div className="pw-card p-4 pw-step-enter" key="done">
          <h2 className="text-lg font-bold text-foreground">All set</h2>
          <p className="text-sm text-[var(--pw-muted)]">
            Your answers are kept in this browser for this visit (and in session
            storage) so the next step can use them in the demo, even before the
            live API.
          </p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/results"
              className="inline-flex min-h-12 flex-1 items-center justify-center rounded-full bg-[var(--pw-primary)] px-4 text-sm font-semibold text-white no-underline transition active:scale-[0.99] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              View results
            </Link>
            <button
              type="button"
              onClick={reset}
              className="min-h-12 flex-1 rounded-full border-2 border-[var(--pw-border)] bg-[var(--pw-surface)] px-4 text-sm font-semibold text-foreground"
            >
              Start over
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <OnboardingProgress
        id="onboarding-progress"
        currentStep={step}
        total={TOTAL_ONBOARDING_STEPS}
      />

      <p className="sr-only" aria-live="polite" aria-atomic>
        {`Step ${step + 1} of ${TOTAL_ONBOARDING_STEPS}. ${question}`}
      </p>

      <div
        className="pw-step-enter will-change-transform"
        key={step}
        id="onboarding-step"
      >
        {step === 0 && (
          <fieldset className="space-y-3 border-0 p-0">
            <legend className="w-full text-base font-semibold leading-snug text-foreground">
              {ONBOARDING_COPY.q1}
            </legend>
            <div className="flex flex-wrap gap-2">
              {ONBOARDING_SUBJECT_OPTIONS.map((o) => {
                const on = answers.subjectIds.includes(o.id);
                return (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() =>
                      setAnswers((a) => ({
                        ...a,
                        subjectIds: toggleSubjectId(a.subjectIds, o.id),
                      }))
                    }
                    aria-pressed={on}
                    className={
                      "min-h-12 rounded-full border-2 px-4 text-sm font-medium transition " +
                      (on
                        ? "border-[var(--pw-primary)] bg-[var(--pw-primary)] text-white"
                        : "border-[var(--pw-border)] bg-[var(--pw-surface)] text-foreground")
                    }
                  >
                    {o.label}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-[var(--pw-muted)]">
              Pick all that apply — at least one.
            </p>
          </fieldset>
        )}

        {step === 1 && (
          <div>
            <label
              className="mb-2 block text-base font-semibold text-foreground"
              htmlFor="q-free"
            >
              {ONBOARDING_COPY.q2}
            </label>
            <textarea
              id="q-free"
              className="pw-tap w-full min-h-[7rem] resize-y rounded-2xl border-2 border-[var(--pw-border)] bg-[var(--pw-surface)] px-3 py-3 text-base text-foreground shadow-sm focus:outline focus:outline-2 focus:outline-offset-2"
              value={answers.freeTime}
              onChange={(e) =>
                setAnswers((a) => ({ ...a, freeTime: e.target.value }))
              }
              maxLength={2000}
            />
          </div>
        )}

        {step === 2 && (
          <div>
            <label
              className="mb-2 block text-base font-semibold text-foreground"
              htmlFor="q-ach"
            >
              {ONBOARDING_COPY.q3}
            </label>
            <textarea
              id="q-ach"
              className="pw-tap w-full min-h-[7rem] resize-y rounded-2xl border-2 border-[var(--pw-border)] bg-[var(--pw-surface)] px-3 py-3 text-base text-foreground focus:outline focus:outline-2 focus:outline-offset-2"
              value={answers.achievements}
              onChange={(e) =>
                setAnswers((a) => ({ ...a, achievements: e.target.value }))
              }
              maxLength={2000}
            />
          </div>
        )}

        {step === 3 && (
          <div className="space-y-3" role="group" aria-label={ONBOARDING_COPY.q4}>
            <p className="text-base font-semibold text-foreground">
              {ONBOARDING_COPY.q4}
            </p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {WORK_OPTIONS.map((o) => {
                const on = answers.workPreference === o.id;
                return (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() =>
                      setAnswers((a) => ({
                        ...a,
                        workPreference: o.id as WorkPreference,
                      }))
                    }
                    aria-pressed={on}
                    className={
                      "flex min-h-14 flex-col items-stretch justify-center rounded-2xl border-2 p-3 text-left transition " +
                      (on
                        ? "border-[var(--pw-primary)] bg-[var(--pw-primary)] text-white"
                        : "border-[var(--pw-border)] bg-[var(--pw-surface)] text-foreground")
                    }
                  >
                    <span className="text-sm font-bold">{o.label}</span>
                    <span
                      className={
                        "text-xs " + (on ? "text-white/90" : "text-[var(--pw-muted)]")
                      }
                    >
                      {o.hint}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-3" role="group" aria-label={ONBOARDING_COPY.q5}>
            <p className="text-base font-semibold text-foreground">
              {ONBOARDING_COPY.q5}
            </p>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() =>
                  setAnswers((a) => ({
                    ...a,
                    studyLocation: "kazakhstan",
                  }))
                }
                aria-pressed={answers.studyLocation === "kazakhstan"}
                className={
                  "min-h-14 w-full rounded-2xl border-2 px-4 text-left text-sm font-bold transition " +
                  (answers.studyLocation === "kazakhstan"
                    ? "border-[var(--pw-primary)] bg-[var(--pw-primary)] text-white"
                    : "border-[var(--pw-border)] bg-[var(--pw-surface)] text-foreground")
                }
              >
                Study in Kazakhstan
              </button>
              <button
                type="button"
                onClick={() =>
                  setAnswers((a) => ({
                    ...a,
                    studyLocation: "abroad",
                  }))
                }
                aria-pressed={answers.studyLocation === "abroad"}
                className={
                  "min-h-14 w-full rounded-2xl border-2 px-4 text-left text-sm font-bold transition " +
                  (answers.studyLocation === "abroad"
                    ? "border-[var(--pw-primary)] bg-[var(--pw-primary)] text-white"
                    : "border-[var(--pw-border)] bg-[var(--pw-surface)] text-foreground")
                }
              >
                Study abroad
              </button>
            </div>
          </div>
        )}

        {step === 5 && (
          <div>
            <label
              className="mb-2 block text-base font-semibold text-foreground"
              htmlFor="q-city"
            >
              {ONBOARDING_COPY.q6}
            </label>
            <input
              id="q-city"
              className="pw-tap w-full min-h-12 rounded-2xl border-2 border-[var(--pw-border)] bg-[var(--pw-surface)] px-3 py-2 text-base text-foreground"
              value={answers.city}
              onChange={(e) =>
                setAnswers((a) => ({ ...a, city: e.target.value }))
              }
              maxLength={120}
              placeholder="E.g. Almaty, Astana"
            />
          </div>
        )}

        {step === 6 && (
          <div>
            <label
              className="mb-2 block text-base font-semibold text-foreground"
              htmlFor="q-bud"
            >
              {ONBOARDING_COPY.q7}
            </label>
            <textarea
              id="q-bud"
              className="w-full min-h-[5rem] resize-y rounded-2xl border-2 border-[var(--pw-border)] bg-[var(--pw-surface)] px-3 py-3 text-base text-foreground"
              value={answers.budgetConstraints}
              onChange={(e) =>
                setAnswers((a) => ({
                  ...a,
                  budgetConstraints: e.target.value,
                }))
              }
              maxLength={2000}
              placeholder="E.g. limited, need a grant — or: none"
            />
            <p className="mt-1 text-xs text-[var(--pw-muted)]">Optional to fill in.</p>
          </div>
        )}
      </div>

      <div className="flex gap-2 pb-2">
        {step > 0 && (
          <button
            type="button"
            onClick={goBack}
            className="min-h-12 min-w-24 flex-1 rounded-full border-2 border-[var(--pw-border)] bg-[var(--pw-surface)] text-sm font-semibold text-foreground"
          >
            Back
          </button>
        )}
        <button
          type="button"
          onClick={goNext}
          disabled={!canNext}
          className="min-h-12 flex-1 rounded-full bg-[var(--pw-primary)] text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isLast ? "Finish" : "Continue"}
        </button>
      </div>
    </div>
  );
}
