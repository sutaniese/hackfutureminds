import { A11yTopBar } from "./A11yTopBar";
import { BottomNav } from "./BottomNav";
import { ThemeInit } from "./ThemeInit";

export function MobileAppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col">
      <a href="#main" className="pw-skip">
        Skip to main content
      </a>
      <ThemeInit />
      <A11yTopBar />
      <main
        id="main"
        className="pw-pb-nav flex-1 overflow-y-auto px-4 py-4"
        style={{ minHeight: "0" }}
      >
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
