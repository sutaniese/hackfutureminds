"use client";

import { useUserProgress } from "./UserProgressProvider";

export function StreakCounter() {
  const { progress } = useUserProgress();

  return (
    <div
      className="flex min-h-12 min-w-12 shrink-0 items-center justify-center gap-1 rounded-full border border-slate-200 bg-white px-3 text-sm font-black text-pathwise-ink shadow-sm"
      aria-label={`Daily streak ${progress.streak} days`}
      title={`${progress.streak} day streak`}
    >
      <span aria-hidden>🔥</span>
      <span>{progress.streak}</span>
    </div>
  );
}
