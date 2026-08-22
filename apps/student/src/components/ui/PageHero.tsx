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
  "aria-label"?: string;
};

export function PageHero({
  kicker,
  title,
  description,
  children,
  className,
  id,
  "aria-label": aria,
}: Props) {
  return (
    <section
      id={id}
      className={cn(
        "pw-soft-panel relative overflow-hidden rounded-[2rem] p-6 md:rounded-[2.5rem] md:p-10",
        className,
      )}
      aria-label={aria}
    >
      <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-slate-50" />
      <div className="pointer-events-none absolute -bottom-20 left-1/3 h-56 w-56 rounded-full bg-slate-50" />
      <div className="pointer-events-none absolute bottom-6 right-8 hidden h-24 w-24 rotate-12 rounded-[2rem] border border-slate-200 bg-white md:block" />
      <div className="relative">
      {kicker ? (
        <p className="inline-flex rounded-full border border-slate-200 bg-white px-3 py-1 text-[0.68rem] font-bold uppercase leading-none tracking-[0.16em] text-pathwise-accent-strong shadow-sm">
          {kicker}
        </p>
      ) : null}
      <h1 className="mt-4 max-w-4xl text-[2.5rem] font-black leading-[0.98] tracking-[-0.04em] text-pathwise-ink md:text-5xl">
        {title}
      </h1>
      {description ? (
        <p className="mt-4 max-w-3xl text-balance text-[15px] leading-7 text-pathwise-muted">
          {description}
        </p>
      ) : null}
      {children}
      </div>
    </section>
  );
}

export function ContentCard({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("pw-card p-5 md:p-6", className)}>{children}</div>;
}
