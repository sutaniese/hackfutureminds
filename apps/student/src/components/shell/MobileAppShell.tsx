"use client";

import { TenWordmark } from "@/components/brand/TenWordmark";
import { SHELL_PX } from "@/lib/shell-layout";
import { useI18n } from "@/i18n/I18nProvider";
import Link from "next/link";
import { A11yTopBar } from "./A11yTopBar";
import { BottomNav } from "./BottomNav";
import { RoleRouteGuard } from "./RoleRouteGuard";
import { ThemeInit } from "./ThemeInit";
import { UnifiedSiteNav } from "./UnifiedSiteNav";

export function MobileAppShell({ children }: { children: React.ReactNode }) {
  const { t } = useI18n();
  return (
    <div className="flex min-h-dvh w-full min-w-0 flex-col bg-pathwise-page text-foreground">
      <a href="#main" className="pw-skip">
        {t("skip")}
      </a>
      <ThemeInit />
      <A11yTopBar />
      <UnifiedSiteNav />
      <main
        id="main"
        className={`pw-pb-nav ${SHELL_PX} mx-auto max-w-6xl flex-1 overflow-y-auto py-5 md:py-8`}
        style={{ minHeight: "0" }}
      >
        <RoleRouteGuard>{children}</RoleRouteGuard>
      </main>
      <footer className="border-t border-pathwise-line bg-pathwise-surface">
        <div
          className={`${SHELL_PX} mx-auto flex max-w-6xl items-center gap-3 py-4 text-xs text-pathwise-muted`}
        >
          <Link
            href="/"
            className="shrink-0 self-center no-underline"
            aria-label="teñ, home"
          >
            <TenWordmark size="sm" presentational />
          </Link>
          <span>{t("footer.line")}</span>
        </div>
      </footer>
      <BottomNav />
    </div>
  );
}
