import Link from "next/link";
import { A11yTopBar } from "./A11yTopBar";
import { BottomNav } from "./BottomNav";
import { ThemeInit } from "./ThemeInit";

export function MobileAppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-6xl flex-col bg-pathwise-page text-foreground">
      <a href="#main" className="pw-skip">
        Skip to main content
      </a>
      <ThemeInit />
      <A11yTopBar />
      <main
        id="main"
        className="pw-pb-nav flex-1 overflow-y-auto px-4 py-4 md:px-5 md:py-6"
        style={{ minHeight: "0" }}
      >
        {children}
      </main>
      <footer className="border-t-2 border-pathwise-line bg-pathwise-surface">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-4 text-xs text-pathwise-muted md:px-5">
          <Link
            href="/"
            className="pw-mark flex h-7 min-w-[1.75rem] shrink-0 items-center justify-center rounded-md px-1 text-[10px] font-bold no-underline"
            aria-hidden
          >
            PW
          </Link>
          <span>
            career navigation for students in Kazakhstan · student app · MVP
          </span>
        </div>
      </footer>
      <BottomNav />
    </div>
  );
}
