import Link from "next/link";

export default function HomePage() {
  return (
    <div className="flex flex-col gap-5">
      <section
        className="rounded-3xl border border-pathwise-line/70 bg-gradient-to-br from-sky-50/90 via-pathwise-surface to-pathwise-surface p-5 shadow-sm md:p-7"
        aria-label="Home intro"
      >
        <p className="text-[0.7rem] font-medium uppercase tracking-[0.14em] text-pathwise-muted">
          student
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-pathwise-ink md:text-3xl">
          Career path in one app
        </h1>
        <p className="mt-3 max-w-xl text-pretty text-base text-pathwise-muted">
          Career map, money route, and resume — for ages 15–18, mobile-first.
        </p>
        <div className="mt-5">
          <Link
            href="/onboarding"
            className="inline-flex min-h-12 min-w-[8rem] items-center justify-center rounded-full bg-pw-primary px-5 text-sm font-semibold text-pw-primary-foreground ring-1 ring-pathwise-line/40 transition active:scale-[0.99] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pw-primary"
          >
            Go to onboarding
          </Link>
        </div>
      </section>

      <div className="pw-card p-4">
        <p className="text-sm text-foreground">
          Use the top bar for contrast, voice, and help. The bottom bar is for
          home, onboarding, results, grants, and portfolio.
        </p>
      </div>
    </div>
  );
}
