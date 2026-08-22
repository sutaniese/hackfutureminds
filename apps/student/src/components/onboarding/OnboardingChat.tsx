"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useI18n } from "@/i18n/I18nProvider";
import {
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

function qKey(step: number) {
  return `onboard.q${step + 1}` as
    | "onboard.q1"
    | "onboard.q2"
    | "onboard.q3"
    | "onboard.q4"
    | "onboard.q5"
    | "onboard.q6"
    | "onboard.q7";
}

export function OnboardingChat() {
  const { t } = useI18n();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<OnboardingAnswers>(() =>
    createEmptyAnswers(),
  );
  const [complete, setComplete] = useState(false);

  const canNext = isStepSatisfied(step, answers);
  const isLast = step === TOTAL_ONBOARDING_STEPS - 1;
  const question = t(qKey(step));

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
          <h2 className="text-lg font-bold text-foreground">
            {t("onboard.allSet")}
          </h2>
          <p className="text-sm text-pathwise-muted">{t("onboard.allSetBody")}</p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/results"
              className="inline-flex min-h-12 flex-1 items-center justify-center rounded-full bg-pw-primary px-4 text-sm font-semibold text-pw-primary-foreground no-underline transition active:scale-[0.99] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              {t("onboard.toResults")}
            </Link>
            <button
              type="button"
              onClick={reset}
              className="min-h-12 flex-1 rounded-full border-2 border-pathwise-line bg-pathwise-surface px-4 text-sm font-semibold text-foreground"
            >
              {t("onboard.startOver")}
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
        {t("onboard.ariaStep", {
          a: step + 1,
          b: TOTAL_ONBOARDING_STEPS,
          c: question,
        })}
      </p>

      <div
        className="pw-card pw-step-enter p-5 will-change-transform md:p-6"
        key={step}
        id="onboarding-step"
      >
        {step === 0 && (
          <fieldset className="space-y-3 border-0 p-0">
            <legend className="w-full text-base font-semibold leading-snug text-foreground">
              {t("onboard.q1")}
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
                        ? "border-pw-primary bg-pw-primary text-pw-primary-foreground"
                        : "border-pathwise-line bg-pathwise-surface text-foreground")
                    }
                  >
                    {t(`onboard.subjects.${o.id}` as "onboard.subjects.math")}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-pathwise-muted">
              {t("onboard.pickSubjects")}
            </p>
          </fieldset>
        )}

        {step === 1 && (
          <div>
            <label
              className="mb-2 block text-base font-semibold text-foreground"
              htmlFor="q-free"
            >
              {t("onboard.q2")}
            </label>
            <textarea
              id="q-free"
              className="pw-tap w-full min-h-[7rem] resize-y rounded-2xl border-2 border-pathwise-line bg-pathwise-surface px-3 py-3 text-base text-foreground shadow-sm focus:outline focus:outline-2 focus:outline-offset-2"
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
              {t("onboard.q3")}
            </label>
            <textarea
              id="q-ach"
              className="pw-tap w-full min-h-[7rem] resize-y rounded-2xl border-2 border-pathwise-line bg-pathwise-surface px-3 py-3 text-base text-foreground focus:outline focus:outline-2 focus:outline-offset-2"
              value={answers.achievements}
              onChange={(e) =>
                setAnswers((a) => ({ ...a, achievements: e.target.value }))
              }
              maxLength={2000}
            />
          </div>
        )}

        {step === 3 && (
          <div className="space-y-3" role="group" aria-label={t("onboard.q4")}>
            <p className="text-base font-semibold text-foreground">
              {t("onboard.q4")}
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
                        ? "border-pw-primary bg-pw-primary text-pw-primary-foreground"
                        : "border-pathwise-line bg-pathwise-surface text-foreground")
                    }
                  >
                    <span className="text-sm font-bold">
                      {t(`onboard.work.${o.id}.label` as "onboard.work.people.label")}
                    </span>
                    <span
                      className={
                        "text-xs " +
                        (on ? "text-pw-primary-foreground/90" : "text-pathwise-muted")
                      }
                    >
                      {t(`onboard.work.${o.id}.hint` as "onboard.work.people.hint")}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-3" role="group" aria-label={t("onboard.q5")}>
            <p className="text-base font-semibold text-foreground">
              {t("onboard.q5")}
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
                    ? "border-pw-primary bg-pw-primary text-pw-primary-foreground"
                    : "border-pathwise-line bg-pathwise-surface text-foreground")
                }
              >
                {t("onboard.studyKz")}
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
                    ? "border-pw-primary bg-pw-primary text-pw-primary-foreground"
                    : "border-pathwise-line bg-pathwise-surface text-foreground")
                }
              >
                {t("onboard.studyAb")}
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
              {t("onboard.q6")}
            </label>
            <input
              id="q-city"
              className="pw-tap w-full min-h-12 rounded-2xl border-2 border-pathwise-line bg-pathwise-surface px-3 py-2 text-base text-foreground"
              value={answers.city}
              onChange={(e) =>
                setAnswers((a) => ({ ...a, city: e.target.value }))
              }
              maxLength={120}
              placeholder={t("onboard.phCity")}
            />
          </div>
        )}

        {step === 6 && (
          <div>
            <label
              className="mb-2 block text-base font-semibold text-foreground"
              htmlFor="q-bud"
            >
              {t("onboard.q7")}
            </label>
            <textarea
              id="q-bud"
              className="w-full min-h-[5rem] resize-y rounded-2xl border-2 border-pathwise-line bg-pathwise-surface px-3 py-3 text-base text-foreground"
              value={answers.budgetConstraints}
              onChange={(e) =>
                setAnswers((a) => ({
                  ...a,
                  budgetConstraints: e.target.value,
                }))
              }
              maxLength={2000}
              placeholder={t("onboard.phBudget")}
            />
            <p className="mt-1 text-xs text-pathwise-muted">
              {t("onboard.optional")}
            </p>
          </div>
        )}
      </div>

      <div className="flex gap-2 pb-2">
        {step > 0 && (
          <button
            type="button"
            onClick={goBack}
            className="pw-secondary-btn pw-focus min-w-24 flex-1 text-sm"
          >
            {t("onboard.back")}
          </button>
        )}
        <button
          type="button"
          onClick={goNext}
          disabled={!canNext}
          className="pw-primary-btn pw-focus flex-1 text-sm disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isLast ? t("onboard.finish") : t("onboard.continue")}
        </button>
      </div>
    </div>
  );
}
