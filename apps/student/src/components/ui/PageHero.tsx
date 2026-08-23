import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/* Shared hero block for student + hub pages. */
type Props = {
  kicker?: string;
  title: string;
  description?: string;
  children?: ReactNode;
  className?: string;
  id?: string;
  /** Плотный вариант для внутренних экранов: контент выше, меньше скролла. */
  compact?: boolean;
  "aria-label"?: string;
};

export function PageHero({
  kicker,
  title,
  description,
  children,
  className,
  id,
  compact = false,
  "aria-label": aria,
}: Props) {
  return (
    <section
      id={id}
      className={cn(
        "pw-soft-panel pw-reveal relative overflow-hidden rounded-[2rem] md:rounded-[2.5rem]",
        compact ? "p-5 md:p-7" : "p-6 md:p-10",
        className,
      )}
      aria-label={aria}
    >
      {/* Мягкое сияние вместо плоских кругов — карточка перестаёт быть «белым на белом». */}
      <div className="pointer-events-none absolute -right-24 -top-28 h-72 w-72 rounded-full bg-[#6C63FF]/[0.07] blur-2xl" />
      <div className="pointer-events-none absolute -bottom-24 left-1/4 h-64 w-64 rounded-full bg-[#43D19E]/[0.06] blur-2xl" />
      <div className="relative">
        {kicker ? (
          <p className="inline-flex rounded-full border border-slate-200 bg-white px-3 py-1 text-[0.68rem] font-bold uppercase leading-none tracking-[0.16em] text-pathwise-accent-strong shadow-sm">
            {kicker}
          </p>
        ) : null}
        <h1
          className={cn(
            "max-w-4xl font-black leading-[1.02] tracking-[-0.04em] text-pathwise-ink",
            compact ? "mt-3 text-[1.75rem] md:text-[2.15rem]" : "mt-4 text-[2.5rem] md:text-5xl",
          )}
        >
          {title}
        </h1>
        {description ? (
          <p
            className={cn(
              "max-w-3xl text-balance leading-7 text-pathwise-muted",
              compact ? "mt-2.5 text-sm" : "mt-4 text-[15px]",
            )}
          >
            {description}
          </p>
        ) : null}
        {children}
      </div>
    </section>
  );
}

export function ContentCard({
  children,
  className,
  id,
}: {
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <div id={id} className={cn("pw-card p-5 md:p-6", className)}>
      {children}
    </div>
  );
}
