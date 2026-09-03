"use client";

import type { ReactNode } from "react";
import { videoClipFor } from "@pathwise/shared";
import { useI18n } from "@/i18n/I18nProvider";
import { cn } from "@/lib/cn";
import type { Difficulty } from "@/lib/learning/types";

/** Мелкие переиспользуемые блоки учебного модуля — в стиле pw-card. */

export function StatTile({
  label,
  value,
  hint,
  tone = "default",
  delay = 0,
}: {
  label: string;
  /** ReactNode — чтобы передавать счётчик <AnimatedNumber/>. */
  value: ReactNode;
  hint?: string;
  tone?: "default" | "accent" | "warn" | "good";
  delay?: number;
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
    <div
      className="pw-reveal rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition duration-300 hover:-translate-y-0.5 hover:border-[#6C63FF]/40 hover:shadow-md"
      style={{ "--d": `${delay}ms` } as React.CSSProperties}
    >
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
  delay = 120,
}: {
  value: number;
  color?: string;
  label?: string;
  /** Задержка старта заливки — для каскада в списках. */
  delay?: number;
}) {
  const { t } = useI18n();
  const safe = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div
      className="h-2.5 overflow-hidden rounded-full bg-slate-100"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={safe}
      aria-label={label ?? t("progress.pct", { n: safe })}
    >
      <div
        className="pw-fill h-full rounded-full transition-[width] duration-700 ease-out"
        style={
          { width: `${safe}%`, backgroundColor: color, "--d": `${delay}ms` } as React.CSSProperties
        }
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
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold transition-colors duration-200",
        toneClass,
      )}
    >
      {children}
    </span>
  );
}

export function ClipBadge({ topicId }: { topicId: string }) {
  const { t, locale } = useI18n();
  if (!videoClipFor(topicId, locale === "kk" ? "kk" : "ru")) return null;
  return <Pill tone="accent">{t("clips.badge")}</Pill>;
}

export function DifficultyBadge({ difficulty }: { difficulty: Difficulty }) {
  const { t } = useI18n();
  const tone = difficulty === 3 ? "warn" : difficulty === 2 ? "accent" : "good";
  return (
    <Pill tone={tone}>
      {t("difficulty.badge", { n: difficulty, label: t(`difficulty.${difficulty}`) })}
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
    <div className="pw-reveal rounded-[1.5rem] border border-dashed border-slate-300 bg-white p-8 text-center">
      <p className="text-base font-black text-pathwise-ink">{title}</p>
      <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-pathwise-muted">{description}</p>
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  );
}
