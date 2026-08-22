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
    case 0: return a.subjectIds.length > 0;
    case 1: return a.freeTime.trim().length > 0;
    case 2: return a.achievements.trim().length > 0;
    case 3: return a.workPreference != null;
    case 4: return a.studyLocation != null;
    case 5: return a.city.trim().length > 0;
    case 6: return true;
    default: return false;
  }
}

function toggleSubjectId(prev: string[], id: string): string[] {
  if (prev.includes(id)) return prev.filter((s) => s !== id);
  return [...prev, id];
}

function qKey(step: number) {
  return `onboard.q${step + 1}` as
    | "onboard.q1" | "onboard.q2" | "onboard.q3"
    | "onboard.q4" | "onboard.q5" | "onboard.q6" | "onboard.q7";
}

export function OnboardingChat() {
  const { t } = useI18n();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<OnboardingAnswers>(() => createEmptyAnswers());
  const [complete, setComplete] = useState(false);

  const canNext = isStepSatisfied(step, answers);
  const isLast = step === TOTAL_ONBOARDING_STEPS - 1;
  const question = t(qKey(step));

  const goBack = useCallback(() => { if (step > 0) setStep((s) => s - 1); }, [step]);

  const goNext = useCallback(() => {
    if (!isStepSatisfied(step, answers)) return;
    if (isLast) setComplete(true);
    else setStep((s) => s + 1);
  }, [step, answers, isLast]);

  useEffect(() => {
    if (complete) {
      try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(answers)); } catch { /* */ }
    }
  }, [complete, answers]);

  const reset = useCallback(() => {
    setComplete(false);
    setStep(0);
    setAnswers(createEmptyAnswers());
  }, []);

  if (complete) {
    return (
      <div className="pw-slide-up" key="done">
        <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-lg">
          <div className="bg-gradient-to-r from-emerald-400 to-teal-400 px-6 py-5 text-white">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
                <svg viewBox="0 0 20 20" fill="currentColor" className="h-6 w-6">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <h2 className="text-xl font-extrabold">{t("onboard.allSet")}</h2>
            </div>
          </div>
          <div className="p-6">
            <p className="text-sm leading-relaxed text-slate-500">{t("onboard.allSetBody")}</p>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <Link href="/results" className="pw-btn-primary flex-1 text-center">
                {t("onboard.toResults")}
              </Link>
              <button type="button" onClick={reset} className="pw-btn-secondary flex-1">
                {t("onboard.startOver")}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <OnboardingProgress id="onboarding-progress" currentStep={step} total={TOTAL_ONBOARDING_STEPS} />

      <p className="sr-only" aria-live="polite" aria-atomic>
        {t("onboard.ariaStep", { a: step + 1, b: TOTAL_ONBOARDING_STEPS, c: question })}
      </p>

      <div className="pw-step-enter will-change-transform pw-card p-5 md:p-6" key={step} id="onboarding-step">
        {step === 0 && (
          <fieldset className="space-y-4 border-0 p-0">
            <legend className="w-full text-base font-bold leading-snug text-foreground">
              {t("onboard.q1")}
            </legend>
            <div className="flex flex-wrap gap-2">
              {ONBOARDING_SUBJECT_OPTIONS.map((o) => {
                const on = answers.subjectIds.includes(o.id);
                return (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => setAnswers((a) => ({ ...a, subjectIds: toggleSubjectId(a.subjectIds, o.id) }))}
                    aria-pressed={on}
                    className={`min-h-11 rounded-xl px-4 text-sm font-semibold transition-all duration-200 ${
                      on
                        ? "bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-md shadow-indigo-500/20"
                        : "border border-slate-200 bg-white text-slate-600 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600"
                    }`}
                  >
                    {t(`onboard.subjects.${o.id}` as "onboard.subjects.math")}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-slate-400">{t("onboard.pickSubjects")}</p>
          </fieldset>
        )}

        {step === 1 && (
          <div>
            <label className="mb-3 block text-base font-bold text-foreground" htmlFor="q-free">
              {t("onboard.q2")}
            </label>
            <textarea
              id="q-free"
              className="w-full min-h-[7rem] resize-y rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm text-foreground shadow-sm transition focus:border-indigo-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100"
              value={answers.freeTime}
              onChange={(e) => setAnswers((a) => ({ ...a, freeTime: e.target.value }))}
              maxLength={2000}
            />
          </div>
        )}

        {step === 2 && (
          <div>
            <label className="mb-3 block text-base font-bold text-foreground" htmlFor="q-ach">
              {t("onboard.q3")}
            </label>
            <textarea
              id="q-ach"
              className="w-full min-h-[7rem] resize-y rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm text-foreground shadow-sm transition focus:border-indigo-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100"
              value={answers.achievements}
              onChange={(e) => setAnswers((a) => ({ ...a, achievements: e.target.value }))}
              maxLength={2000}
            />
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4" role="group" aria-label={t("onboard.q4")}>
            <p className="text-base font-bold text-foreground">{t("onboard.q4")}</p>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {WORK_OPTIONS.map((o) => {
                const on = answers.workPreference === o.id;
                return (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => setAnswers((a) => ({ ...a, workPreference: o.id as WorkPreference }))}
                    aria-pressed={on}
                    className={`flex min-h-14 flex-col items-stretch justify-center rounded-xl p-4 text-left transition-all duration-200 ${
                      on
                        ? "bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-md shadow-indigo-500/20 ring-2 ring-indigo-300"
                        : "border border-slate-200 bg-white text-foreground hover:border-indigo-200 hover:shadow-sm"
                    }`}
                  >
                    <span className="text-sm font-bold">
                      {t(`onboard.work.${o.id}.label` as "onboard.work.people.label")}
                    </span>
                    <span className={`text-xs ${on ? "text-white/80" : "text-slate-400"}`}>
                      {t(`onboard.work.${o.id}.hint` as "onboard.work.people.hint")}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4" role="group" aria-label={t("onboard.q5")}>
            <p className="text-base font-bold text-foreground">{t("onboard.q5")}</p>
            <div className="flex flex-col gap-2.5">
              {(["kazakhstan", "abroad"] as const).map((loc) => {
                const on = answers.studyLocation === loc;
                return (
                  <button
                    key={loc}
                    type="button"
                    onClick={() => setAnswers((a) => ({ ...a, studyLocation: loc }))}
                    aria-pressed={on}
                    className={`min-h-14 w-full rounded-xl px-5 text-left text-sm font-bold transition-all duration-200 ${
                      on
                        ? "bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-md shadow-indigo-500/20 ring-2 ring-indigo-300"
                        : "border border-slate-200 bg-white text-foreground hover:border-indigo-200 hover:shadow-sm"
                    }`}
                  >
                    {t(loc === "kazakhstan" ? "onboard.studyKz" : "onboard.studyAb")}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {step === 5 && (
          <div>
            <label className="mb-3 block text-base font-bold text-foreground" htmlFor="q-city">
              {t("onboard.q6")}
            </label>
            <input
              id="q-city"
              className="w-full min-h-12 rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm text-foreground shadow-sm transition focus:border-indigo-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100"
              value={answers.city}
              onChange={(e) => setAnswers((a) => ({ ...a, city: e.target.value }))}
              maxLength={120}
              placeholder={t("onboard.phCity")}
            />
          </div>
        )}

        {step === 6 && (
          <div>
            <label className="mb-3 block text-base font-bold text-foreground" htmlFor="q-bud">
              {t("onboard.q7")}
            </label>
            <textarea
              id="q-bud"
              className="w-full min-h-[5rem] resize-y rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm text-foreground shadow-sm transition focus:border-indigo-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100"
              value={answers.budgetConstraints}
              onChange={(e) => setAnswers((a) => ({ ...a, budgetConstraints: e.target.value }))}
              maxLength={2000}
              placeholder={t("onboard.phBudget")}
            />
            <p className="mt-1.5 text-xs text-slate-400">{t("onboard.optional")}</p>
          </div>
        )}
      </div>

      <div className="flex gap-3 pb-2">
        {step > 0 && (
          <button type="button" onClick={goBack} className="pw-btn-secondary min-w-24 flex-1">
            {t("onboard.back")}
          </button>
        )}
        <button
          type="button"
          onClick={goNext}
          disabled={!canNext}
          className="pw-btn-primary flex-1 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
        >
          {isLast ? t("onboard.finish") : t("onboard.continue")}
        </button>
      </div>
    </div>
  );
}
