import Link from "next/link";

export default function HomePage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold tracking-tight text-foreground">
        PathWise — Student
      </h1>
      <p className="text-base text-[var(--pw-muted)]">
        Career map, money route, and resume in one place — built for
        15–18, mobile-first.
      </p>
      <div className="pw-card p-4">
        <p className="mb-4 text-sm text-foreground">
          Use the top bar for contrast, voice, and help. The bottom bar moves
          between home, onboarding, results, grants, and portfolio.
        </p>
        <Link
          href="/onboarding"
          className="inline-flex min-h-12 min-w-[8rem] items-center justify-center rounded-full bg-[var(--pw-primary)] px-4 text-sm font-semibold text-white transition active:scale-[0.99] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pw-primary)]"
        >
          Go to onboarding
        </Link>
      </div>
    </div>
  );
}
