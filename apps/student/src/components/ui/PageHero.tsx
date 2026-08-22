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
        "pw-soft-panel relative overflow-hidden rounded-[2rem] p-5 md:rounded-[2.5rem] md:p-8",
        className,
      )}
      aria-label={aria}
    >
      <div className="pointer-events-none absolute -right-16 -top-20 h-52 w-52 rounded-full bg-pathwise-accent/10 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 right-8 hidden h-24 w-24 rounded-[2rem] border border-white/80 bg-white/35 rotate-12 md:block" />
      <div className="relative">
      {kicker ? (
        <p className="inline-flex rounded-full bg-white/70 px-3 py-1 text-[0.68rem] font-bold uppercase leading-none tracking-[0.16em] text-pathwise-accent-strong ring-1 ring-pathwise-line/70">
          {kicker}
        </p>
      ) : null}
      <h1 className="mt-4 max-w-4xl text-3xl font-black leading-[1.05] tracking-tight text-pathwise-ink md:text-5xl">
        {title}
      </h1>
      {description ? (
        <p className="mt-4 max-w-3xl text-balance text-sm leading-6 text-pathwise-muted md:text-base md:leading-7">
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
