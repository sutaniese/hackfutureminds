"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import {
  ROLE_ENTRY_PATHS,
  ROLE_LABEL_KEYS,
  isPathAllowedForRole,
  roleForPath,
  type UserRole,
} from "@/lib/site-nav";
import { canAccessUniversityLayer, isUniversityNavHref } from "@pathwise/shared";
import { useLearning } from "@/components/learning/useLearning";
import { useSelectedRole } from "./useSelectedRole";
import { useAuth } from "./useAuth";
import { useI18n } from "@/i18n/I18nProvider";

/** Routes that don't require an account or a role. */
const PUBLIC_PATHS = new Set<string>(["/", "/login", "/register"]);
const PUBLIC_PREFIXES = ["/accessibility"];

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATHS.has(pathname)) return true;
  return PUBLIC_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

function GuardMessage({
  title,
  description,
  primaryHref,
  primaryLabel,
  secondaryHref,
  secondaryLabel,
  currentRole,
}: {
  title: string;
  description: string;
  primaryHref: string;
  primaryLabel: string;
  secondaryHref?: string;
  secondaryLabel?: string;
  currentRole?: UserRole | null;
}) {
  const { t } = useI18n();
  return (
    <section className="pw-soft-panel rounded-[2rem] p-6 md:p-8">
      <p className="inline-flex rounded-full bg-white/70 px-3 py-1 text-[0.68rem] font-bold uppercase tracking-[0.16em] text-pathwise-accent-strong ring-1 ring-pathwise-line/70">
        {t("guard.kicker")}
      </p>
      <h1 className="mt-4 max-w-3xl text-3xl font-black leading-tight text-pathwise-ink md:text-4xl">
        {title}
      </h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-pathwise-muted">
        {description}
      </p>
      {currentRole ? (
        <p className="mt-4 text-sm font-semibold text-pathwise-ink">
          {t("guard.current", { role: t(ROLE_LABEL_KEYS[currentRole]) })}
        </p>
      ) : null}
      <div className="mt-6 flex flex-wrap gap-3">
        <Link href={primaryHref} className="pw-primary-btn pw-focus px-5 text-sm">
          {primaryLabel}
        </Link>
        {secondaryHref && secondaryLabel ? (
          <Link href={secondaryHref} className="pw-secondary-btn pw-focus px-5 text-sm">
            {secondaryLabel}
          </Link>
        ) : null}
      </div>
    </section>
  );
}

export function RoleRouteGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "/";
  const router = useRouter();
  const { role, ready } = useSelectedRole();
  const { user, status } = useAuth();
  const { t } = useI18n();
  const { profile } = useLearning();
  const effectiveRole = role ?? roleForPath(pathname);

  // Auto-redirect guests away from private pages to /login (preserves redirect target).
  useEffect(() => {
    if (status === "loading") return;
    if (status !== "guest") return;
    if (isPublicPath(pathname)) return;
    const redirect = encodeURIComponent(pathname);
    router.replace(`/login?redirect=${redirect}`);
  }, [status, pathname, router]);

  if (!ready || status === "loading") return <>{children}</>;
  if (isPublicPath(pathname)) return <>{children}</>;

  if (!user) {
    const redirect = encodeURIComponent(pathname);
    return (
      <GuardMessage
        title={t("guard.loginTitle")}
        description={t("guard.loginBody")}
        primaryHref={`/login?redirect=${redirect}`}
        primaryLabel={t("guard.login")}
        secondaryHref={`/register?redirect=${redirect}`}
        secondaryLabel={t("guard.register")}
      />
    );
  }

  if (!effectiveRole) {
    return (
      <GuardMessage
        title={t("guard.pickTitle")}
        description={t("guard.pickBody")}
        primaryHref="/"
        primaryLabel={t("guard.pick")}
      />
    );
  }

  if (!isPathAllowedForRole(pathname, effectiveRole)) {
    return (
      <GuardMessage
        title={t("guard.deniedTitle")}
        description={t("guard.deniedBody")}
        currentRole={effectiveRole}
        primaryHref={ROLE_ENTRY_PATHS[effectiveRole]}
        primaryLabel={t("guard.cabinet")}
      />
    );
  }

  if (
    effectiveRole === "student" &&
    isUniversityNavHref(pathname) &&
    !canAccessUniversityLayer(profile?.grade)
  ) {
    return (
      <GuardMessage
        title={t("guard.grade.title")}
        description={t("guard.grade.body")}
        currentRole={effectiveRole}
        primaryHref="/learning"
        primaryLabel={t("guard.grade.cta")}
      />
    );
  }

  return <>{children}</>;
}
