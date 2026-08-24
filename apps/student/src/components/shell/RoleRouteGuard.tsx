"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import {
  ROLE_ENTRY_PATHS,
  ROLE_LABELS,
  isPathAllowedForRole,
  roleForPath,
  type UserRole,
} from "@/lib/site-nav";
import { useSelectedRole } from "./useSelectedRole";
import { useAuth } from "./useAuth";

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
  return (
    <section className="pw-soft-panel rounded-[2rem] p-6 md:p-8">
      <p className="inline-flex rounded-full bg-white/70 px-3 py-1 text-[0.68rem] font-bold uppercase tracking-[0.16em] text-pathwise-accent-strong ring-1 ring-pathwise-line/70">
        Доступ по роли
      </p>
      <h1 className="mt-4 max-w-3xl text-3xl font-black leading-tight text-pathwise-ink md:text-4xl">
        {title}
      </h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-pathwise-muted">
        {description}
      </p>
      {currentRole ? (
        <p className="mt-4 text-sm font-semibold text-pathwise-ink">
          Сейчас выбрана роль: {ROLE_LABELS[currentRole]}.
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
  const effectiveRole = role ?? roleForPath(pathname);

  // Auto-redirect guests away from private pages to /login (preserves redirect target).
  useEffect(() => {
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
        title="Войдите, чтобы продолжить"
        description="Эта страница доступна только зарегистрированным пользователям. Войдите в аккаунт или создайте новый."
        primaryHref={`/login?redirect=${redirect}`}
        primaryLabel="Войти"
        secondaryHref={`/register?redirect=${redirect}`}
        secondaryLabel="Зарегистрироваться"
      />
    );
  }

  if (!effectiveRole) {
    return (
      <GuardMessage
        title="Сначала выберите вход"
        description="Страницы открываются по ролям: студенту, родителю или учителю. Выберите роль на главной, и мы покажем только нужные разделы."
        primaryHref="/"
        primaryLabel="Выбрать роль"
      />
    );
  }

  if (!isPathAllowedForRole(pathname, effectiveRole)) {
    return (
      <GuardMessage
        title="Эта страница недоступна для выбранной роли"
        description="Чтобы не смешивать кабинеты, навигация и страницы разделены по ролям. Вернитесь на главный экран и выберите подходящий вход."
        currentRole={effectiveRole}
        primaryHref={ROLE_ENTRY_PATHS[effectiveRole]}
        primaryLabel="В кабинет"
      />
    );
  }

  return <>{children}</>;
}
