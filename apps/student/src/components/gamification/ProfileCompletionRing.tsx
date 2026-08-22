"use client";

import { useUserProgress } from "./UserProgressProvider";

export function ProfileCompletionRing() {
  const { progress } = useUserProgress();
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress.profileCompletion / 100) * circumference;

  return (
    <div
      className="flex items-center gap-4 rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm"
      aria-label={`Profile completion ${progress.profileCompletion}%`}
    >
      <svg
        viewBox="0 0 100 100"
        className="h-24 w-24 shrink-0 -rotate-90"
        role="img"
        aria-label={`Profile completion ring ${progress.profileCompletion}%`}
      >
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth="10"
        />
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke="#6C63FF"
          strokeLinecap="round"
          strokeWidth="10"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <div>
        <p className="text-3xl font-black tracking-tight text-pathwise-ink">
          {progress.profileCompletion}%
        </p>
        <p className="mt-1 text-sm font-semibold leading-6 text-pathwise-muted">
          Профиль заполняется по мере прохождения модулей: анкета, результаты и портфолио.
        </p>
      </div>
    </div>
  );
}
