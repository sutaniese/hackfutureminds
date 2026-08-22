import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import type { Difficulty } from "@/lib/learning/types";
import { DIFFICULTY_LABELS } from "@/lib/learning/types";

/** Мелкие переиспользуемые блоки учебного модуля — в стиле pw-card. */

export function StatTile({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "accent" | "warn" | "good";
}) {
  const toneClass =
    tone === "accent"
      ? "text-[#6C63FF]"
      : tone === "warn"
        ? "text-[#E75555]"
        : tone === "good"
          ? "text-emerald-600"
          : "text-pathwise-ink";

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-pathwise-muted">{label}</p>
      <p className={cn("mt-1 text-2xl font-black tracking-tight", toneClass)}>{value}</p>
      {hint ? <p className="mt-1 text-xs font-semibold leading-5 text-pathwise-muted">{hint}</p> : null}
    </div>
  );
}

export function ProgressBar({
  value,
  color = "#6C63FF",
  label,
}: {
  value: number;
  color?: string;
  label?: string;
}) {
  const safe = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div
      className="h-2.5 overflow-hidden rounded-full bg-slate-100"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={safe}
      aria-label={label ?? `Прогресс ${safe}%`}
    >
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{ width: `${safe}%`, backgroundColor: color }}
      />
    </div>
  );
}

export function Pill({
  children,
  tone = "muted",
}: {
  children: ReactNode;
  tone?: "muted" | "accent" | "good" | "warn";
}) {
  const toneClass =
    tone === "accent"
      ? "bg-[#6C63FF]/10 text-[#554dd6]"
      : tone === "good"
        ? "bg-emerald-500/10 text-emerald-700"
        : tone === "warn"
          ? "bg-[#FF6B6B]/10 text-[#c63d3d]"
          : "bg-slate-100 text-slate-600";

  return (
    <span className={cn("inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold", toneClass)}>
      {children}
    </span>
  );
}

export function DifficultyBadge({ difficulty }: { difficulty: Difficulty }) {
  const tone = difficulty === 3 ? "warn" : difficulty === 2 ? "accent" : "good";
  return (
    <Pill tone={tone}>
      Уровень {difficulty} · {DIFFICULTY_LABELS[difficulty]}
    </Pill>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-[1.5rem] border border-dashed border-slate-300 bg-white p-6 text-center">
      <p className="text-base font-black text-pathwise-ink">{title}</p>
      <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-pathwise-muted">{description}</p>
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  );
}
