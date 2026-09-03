"use client";

import { TenWordmark } from "@/components/brand/TenWordmark";
import { BadgeToast } from "@/components/gamification/BadgeToast";
import { LevelUpModal } from "@/components/gamification/LevelUpModal";
import { XPBar } from "@/components/gamification/XPBar";
import { SHELL_PX } from "@/lib/shell-layout";
import { useI18n } from "@/i18n/I18nProvider";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { A11yTopBar } from "./A11yTopBar";
import { UnifiedSiteNav } from "./UnifiedSiteNav";
import { RoleRouteGuard } from "./RoleRouteGuard";
import { useAuth } from "./useAuth";
import { RouteTransition } from "./RouteTransition";
import { BottomNav } from "./BottomNav";
import { ThemeInit } from "./ThemeInit";

const HIDE_NAV_PATHS = ["/learning/diagnostics"];

export function MobileAppShell({ children }: { children: React.ReactNode }) {
  const { t } = useI18n();
  const { user } = useAuth();
  const pathname = usePathname() || "/";
  const showStudentNav = !user || user.role === "student";
  const hideBottomNav = HIDE_NAV_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
  return (
    <div className="flex min-h-dvh w-full min-w-0 flex-col bg-pathwise-page text-foreground">
      <a href="#main" className="pw-skip">
        {t("skip")}
      </a>
      <ThemeInit />
      {/* Шапка и XP-полоса липнут одним блоком: высота считается версткой,
          поэтому полоса не может уехать под шапку на устройствах с вырезом. */}
      <div className="sticky top-0 z-30 shrink-0">
        <A11yTopBar />
        {/* Students already have BottomNav; keep this bar for teacher/parent on student-shell routes. */}
        {showStudentNav ? null : <UnifiedSiteNav />}
        <XPBar />
      </div>
      <main
        id="main"
        className={`${showStudentNav && !hideBottomNav ? "pw-pb-nav" : ""} ${SHELL_PX} flex-1 overflow-y-auto py-6 md:py-10`}
        style={{ minHeight: "0" }}
      >
        <RouteTransition>
          <RoleRouteGuard>{children}</RoleRouteGuard>
        </RouteTransition>
      </main>
      <footer className="border-t border-pathwise-line/50 bg-white ">
        <div
          className={`${SHELL_PX} flex items-center gap-3 py-5 pb-28 text-xs text-pathwise-muted md:pb-24`}
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
      {showStudentNav && !hideBottomNav ? <BottomNav /> : null}
      <BadgeToast />
      <LevelUpModal />
    </div>
  );
}
