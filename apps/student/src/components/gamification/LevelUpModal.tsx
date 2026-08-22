"use client";

import { useEffect } from "react";
import { useUserProgress } from "./UserProgressProvider";

export function LevelUpModal() {
  const { levelUp, dismissLevelUp } = useUserProgress();

  useEffect(() => {
    if (!levelUp) return;
    const timer = window.setTimeout(dismissLevelUp, 2500);
    return () => window.clearTimeout(timer);
  }, [dismissLevelUp, levelUp]);

  if (!levelUp) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-5"
      role="dialog"
      aria-modal="true"
      aria-label={`Level up to ${levelUp.name}`}
    >
      <div className="pw-level-modal relative w-full max-w-sm overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-6 text-center shadow-[0_24px_70px_rgb(15_23_42_/_0.18)]">
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          {Array.from({ length: 18 }).map((_, index) => (
            <span
              key={index}
              className="pw-confetti absolute h-2 w-2 rounded-full bg-[#6C63FF]"
              style={{
                left: `${8 + ((index * 17) % 84)}%`,
                animationDelay: `${index * 45}ms`,
              }}
            />
          ))}
        </div>
        <div className="relative">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-pathwise-accent-strong">
            Level up
          </p>
          <h2 className="mt-3 text-3xl font-black tracking-tight text-pathwise-ink">
            {levelUp.name}
          </h2>
          <p className="mt-3 text-sm leading-6 text-pathwise-muted">
            Ты стал ближе к поступлению мечты. Продолжай собирать свой маршрут.
          </p>
        </div>
      </div>
    </div>
  );
}
