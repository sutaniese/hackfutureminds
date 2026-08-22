"use client";

import { TenWordmark } from "@/components/brand/TenWordmark";
import { SHELL_PX } from "@/lib/shell-layout";
import { useI18n } from "@/i18n/I18nProvider";
import Link from "next/link";
import { A11yTopBar } from "./A11yTopBar";
import { BottomNav } from "./BottomNav";
import { ThemeInit } from "./ThemeInit";

export function MobileAppShell({ children }: { children: React.ReactNode }) {
  const { t } = useI18n();
  return (
    <div className="flex min-h-dvh w-full min-w-0 flex-col bg-pathwise-page text-foreground">
      <a href="#main" className="pw-skip">
        {t("skip")}
      </a>
      <ThemeInit />
      <A11yTopBar />
      <main
        id="main"
        className={`pw-pb-nav ${SHELL_PX} flex-1 overflow-y-auto py-5 md:py-8`}
        style={{ minHeight: "0" }}
      >
        {children}
      </main>
      <footer className="border-t border-pathwise-line/50 bg-pathwise-surface/80 backdrop-blur-md">
        <div
          className={`${SHELL_PX} flex items-center gap-3 py-5 text-xs text-pathwise-muted`}
        >
          <Link
            href="/"
            className="shrink-0 self-center no-underline"
            aria-label="teñ, home"
          >
            <TenWordmark size="sm" presentational />
          </Link>
          <span className="opacity-70">{t("footer.line")}</span>
        </div>
      </footer>
      <BottomNav />
    </div>
  );
}
