"use client";

import { useEffect } from "react";
import { useUserProgress } from "./UserProgressProvider";

export function BadgeToast() {
  const { badgeToast, dismissBadgeToast } = useUserProgress();

  useEffect(() => {
    if (!badgeToast) return;
    const timer = window.setTimeout(dismissBadgeToast, 3000);
    return () => window.clearTimeout(timer);
  }, [badgeToast, dismissBadgeToast]);

  if (!badgeToast) return null;

  return (
    <div
      className="pw-badge-toast fixed bottom-28 left-4 right-4 z-50 mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_18px_45px_rgb(15_23_42_/_0.18)]"
      role="status"
      aria-live="polite"
      aria-label={`Badge earned: ${badgeToast.name}`}
    >
      <span
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#6C63FF] text-lg font-black text-white"
        aria-hidden
      >
        {badgeToast.icon}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-black text-pathwise-ink">
          {badgeToast.name}
        </span>
        <span className="mt-0.5 block text-xs leading-5 text-pathwise-muted">
          {badgeToast.description}
        </span>
      </span>
    </div>
  );
}
