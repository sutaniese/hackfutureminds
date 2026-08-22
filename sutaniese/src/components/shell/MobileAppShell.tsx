import { TenWordmark } from "@/components/brand/TenWordmark";
import { SHELL_PX } from "@/lib/shell-layout";
import Link from "next/link";
import { A11yTopBar } from "./A11yTopBar";
import { BottomNav } from "./BottomNav";
import { ThemeInit } from "./ThemeInit";

export function MobileAppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh w-full min-w-0 flex-col bg-pathwise-page text-foreground">
      <a href="#main" className="pw-skip">
        Skip to main content
      </a>
      <ThemeInit />
      <A11yTopBar />
      <main
        id="main"
        className={`pw-pb-nav ${SHELL_PX} flex-1 overflow-y-auto py-4 md:py-6`}
        style={{ minHeight: "0" }}
      >
        {children}
      </main>
      <footer className="border-t border-pathwise-line bg-pathwise-surface">
        <div
          className={`${SHELL_PX} flex items-center gap-3 py-4 text-xs text-pathwise-muted`}
        >
          <Link
            href="/"
            className="shrink-0 self-center no-underline"
            aria-label="teñ, home"
          >
            <TenWordmark size="sm" presentational />
          </Link>
          <span>career navigation for students in Kazakhstan · MVP</span>
        </div>
      </footer>
      <BottomNav />
    </div>
  );
}
