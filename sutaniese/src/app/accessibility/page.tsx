import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Accessibility",
  description: "teñ. a11y options and help",
};

export default function AccessibilityPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold text-foreground">Accessibility</h1>
      <p className="text-sm text-[var(--pw-muted)]">
        The top bar in the app is always here: <strong>Contrast</strong> bumps
        borders and type for high contrast, <strong>Voice</strong> records a
        preference for when voice onboarding is enabled, and{" "}
        <strong>Help</strong> opens this screen.
      </p>
      <ul className="list-inside list-disc space-y-2 text-sm text-foreground">
        <li>
          <strong>Keyboard / focus:</strong> all actions use a visible focus
          style in high-contrast mode.
        </li>
        <li>
          <strong>Main landmark:</strong> the scrollable area uses a{" "}
          <code className="rounded bg-black/5 px-1 text-xs">main</code> element
          with <code className="rounded bg-black/5 px-1 text-xs">id=&quot;main&quot;</code>{" "}
          for skip links and assistive tech.
        </li>
        <li>
          <strong>Screen readers:</strong> the bottom bar is announced as
          &quot;Main sections&quot; navigation; the current tab is
          <code className="mx-1 rounded bg-black/5 px-1 text-xs">
            aria-current=page
          </code>
          .
        </li>
      </ul>
      <div className="pw-card p-4 text-sm text-foreground">
        Kazakh / Russian copy can layer on these routes without changing
        structure (later step in the product plan).
      </div>
      <Link
        href="/"
        className="inline-flex min-h-12 items-center self-start text-sm font-semibold text-[var(--pw-primary)] no-underline underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        Back to home
      </Link>
    </div>
  );
}
