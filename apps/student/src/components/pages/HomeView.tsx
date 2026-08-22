"use client";

import Link from "next/link";
import { PORTAL_PATHS, portalHref } from "@pathwise/shared/links";
import { ContentCard, PageHero } from "@/components/ui/PageHero";
import { useI18n } from "@/i18n/I18nProvider";
import type { UserRole } from "@/lib/site-nav";
import { useSelectedRole } from "@/components/shell/useSelectedRole";

export function HomeView() {
  const { t } = useI18n();
  const { setRole, clearRole } = useSelectedRole();
  const portalBase = process.env.NEXT_PUBLIC_PORTAL_URL?.trim() || undefined;

  const entryCards: Array<{
    role: UserRole;
    href: string;
    label: string;
    title: string;
    body: string;
    badge: string;
  }> = [
    {
      role: "student",
      href: "/onboarding",
      label: "Вход для студента",
      title: "Начать свой карьерный путь",
      body: "Пройти анкету, получить план, гранты и собрать портфолио.",
      badge: "Студент",
    },
    {
      role: "parent",
      href: portalHref(PORTAL_PATHS.parents, portalBase),
      label: "Вход для родителя",
      title: "Открыть семейный кабинет",
      body: "Посмотреть профиль ребёнка, бюджет, сравнение профессий и PDF-отчёт.",
      badge: "Родитель",
    },
    {
      role: "teacher",
      href: portalHref(PORTAL_PATHS.teachers, portalBase),
      label: "Вход для учителя",
      title: "Перейти к классу",
      body: "Управлять учениками, инвайт-кодами, рекомендациями и выгрузками.",
      badge: "Учитель",
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <PageHero
        kicker={t("home.kicker")}
        title={t("home.title")}
        description={t("home.body")}
        aria-label="home"
      >
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {entryCards.map((entry) => (
            <Link
              key={entry.href}
              href={entry.href}
              onClick={() => setRole(entry.role)}
              className="group rounded-2xl border border-pathwise-line/80 bg-white/75 p-4 text-left no-underline shadow-sm transition hover:-translate-y-0.5 hover:border-pathwise-accent hover:bg-white"
              aria-label={entry.label}
            >
              <span className="inline-flex rounded-full bg-pathwise-accent-soft px-2.5 py-1 text-[0.65rem] font-bold uppercase tracking-[0.14em] text-pathwise-accent-strong">
                {entry.badge}
              </span>
              <h2 className="mt-3 text-base font-black leading-tight text-pathwise-ink">
                {entry.title}
              </h2>
              <p className="mt-2 text-xs leading-5 text-pathwise-muted">{entry.body}</p>
              <span className="mt-4 inline-flex text-xs font-bold text-pathwise-accent-strong">
                {entry.label} →
              </span>
            </Link>
          ))}
        </div>
      </PageHero>

      <ContentCard className="bg-gradient-to-r from-pathwise-accent-soft via-pathwise-surface to-pathwise-surface">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <p className="max-w-3xl text-sm leading-6 text-foreground">
            Сначала выберите роль. После входа верхняя навигация покажет только те страницы,
            которые нужны выбранному пользователю.
          </p>
          <button
            type="button"
            onClick={clearRole}
            className="pw-secondary-btn pw-focus shrink-0 px-4 text-sm"
          >
            Сбросить роль
          </button>
        </div>
      </ContentCard>
    </div>
  );
}
