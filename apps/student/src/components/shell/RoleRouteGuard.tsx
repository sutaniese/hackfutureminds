"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ROLE_LABELS,
  isPathAllowedForRole,
  roleForPath,
  type UserRole,
} from "@/lib/site-nav";
import { useSelectedRole } from "./useSelectedRole";

function GuardMessage({
  title,
  description,
  currentRole,
  onClear,
}: {
  title: string;
  description: string;
  currentRole?: UserRole | null;
  onClear: () => void;
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
        <Link href="/" onClick={onClear} className="pw-primary-btn pw-focus px-5 text-sm">
          Выбрать роль
        </Link>
      </div>
    </section>
  );
}

export function RoleRouteGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "/";
  const { role, ready, clearRole } = useSelectedRole();
  const effectiveRole = role ?? roleForPath(pathname);

  if (!ready) return <>{children}</>;
  if (pathname === "/") return <>{children}</>;

  if (!effectiveRole) {
    return (
      <GuardMessage
        title="Сначала выберите вход"
        description="Страницы открываются по ролям: студенту, родителю или учителю. Выберите роль на главной, и мы покажем только нужные разделы."
        onClear={clearRole}
      />
    );
  }

  if (!isPathAllowedForRole(pathname, effectiveRole)) {
    return (
      <GuardMessage
        title="Эта страница недоступна для выбранной роли"
        description="Чтобы не смешивать кабинеты, навигация и страницы разделены по ролям. Вернитесь на главный экран и выберите подходящий вход."
        currentRole={effectiveRole}
        onClear={clearRole}
      />
    );
  }

  return <>{children}</>;
}
