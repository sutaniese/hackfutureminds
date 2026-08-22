"use client";

import { useUserProgress } from "./UserProgressProvider";
import { StreakCounter } from "./StreakCounter";

export function XPBar() {
  const { progress, levelName, levelProgress } = useUserProgress();

  return (
    <section
      className="relative z-20 border-b border-slate-200 bg-white/95"
      aria-label={`XP progress: ${progress.xp} XP, level ${progress.level} ${levelName}`}
    >
      <div className="mx-auto flex min-h-12 w-full max-w-7xl items-center gap-3 px-4 pb-2.5 pt-3.5 sm:px-6 lg:px-8">
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center justify-between gap-3 text-[11px] font-black uppercase tracking-[0.12em]">
            <span className="truncate text-pathwise-ink">
              Level {progress.level} · {levelName}
            </span>
            <span className="shrink-0 text-pathwise-accent-strong" aria-live="polite">
              {progress.xp} XP
            </span>
          </div>
          <div
            className="h-2 overflow-hidden rounded-full bg-slate-100"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={levelProgress}
            aria-label={`Progress to next level ${levelProgress}%`}
          >
            <div
              className="h-full rounded-full bg-[#6C63FF] transition-all duration-700 ease-out"
              style={{ width: `${levelProgress}%` }}
            />
          </div>
        </div>
        <StreakCounter />
      </div>
    </section>
  );
}
