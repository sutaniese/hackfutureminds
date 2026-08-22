import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/* Hero block aligned with teñ. / hackhack (rounded panel, kicker, title) */
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
        "rounded-[2.2rem] border border-pathwise-line/80 bg-gradient-to-br from-sky-50/95 via-pathwise-surface to-pathwise-surface p-5 shadow-sm md:rounded-[2.5rem] md:p-8",
        className,
      )}
      aria-label={aria}
    >
      {kicker ? (
        <p className="text-[0.7rem] font-bold uppercase leading-none tracking-[0.16em] text-sky-600/90">
          {kicker}
        </p>
      ) : null}
      <h1 className="mt-3 text-2xl font-bold leading-tight tracking-tight text-pathwise-ink md:text-3xl">
        {title}
      </h1>
      {description ? (
        <p className="mt-3 max-w-3xl text-balance text-sm text-pathwise-muted md:text-base">
          {description}
        </p>
      ) : null}
      {children}
    </section>
  );
}

export function ContentCard({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("pw-card p-4 md:p-5", className)}>{children}</div>;
}
