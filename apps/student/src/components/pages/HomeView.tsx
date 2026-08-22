"use client";

import Link from "next/link";
import { PORTAL_PATHS, portalHref } from "@pathwise/shared/links";
import { ContentCard, PageHero } from "@/components/ui/PageHero";
import { useI18n } from "@/i18n/I18nProvider";

export function HomeView() {
  const { t } = useI18n();
  const portalBase = process.env.NEXT_PUBLIC_PORTAL_URL?.trim() || undefined;

  const roleCards = [
    {
      href: "/onboarding",
      label: "Ученик",
      title: "Собрать карьерный профиль",
      body: "7 коротких вопросов, затем персональный план, гранты и портфолио.",
      tone: "from-blue-50 to-white",
    },
    {
      href: portalHref(PORTAL_PATHS.parents, portalBase),
      label: "Родители",
      title: "Понять финансы и выбор",
      body: "Финкалькулятор, сравнение профессий и понятный отчёт по ребёнку.",
      tone: "from-emerald-50 to-white",
    },
    {
      href: portalHref(PORTAL_PATHS.teachers, portalBase),
      label: "Учителя",
      title: "Вести класс и рекомендации",
      body: "Инвайт-коды, сводный дашборд и рекомендательные письма.",
      tone: "from-amber-50 to-white",
    },
    {
      href: portalHref(PORTAL_PATHS.universities, portalBase),
      label: "Вузы",
      title: "Выбрать программу",
      body: "Каталог университетов Казахстана, дедлайны, языки и гранты.",
      tone: "from-violet-50 to-white",
    },
  ];

  const entryCards = [
    {
      href: "/onboarding",
      label: "Вход для студента",
      title: "Начать свой карьерный путь",
      body: "Пройти анкету, получить план, гранты и собрать портфолио.",
      badge: "Студент",
    },
    {
      href: portalHref(PORTAL_PATHS.parents, portalBase),
      label: "Вход для родителя",
      title: "Открыть семейный кабинет",
      body: "Посмотреть профиль ребёнка, бюджет, сравнение профессий и PDF-отчёт.",
      badge: "Родитель",
    },
    {
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
        <div className="mt-6 flex flex-col items-start gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <Link
            href="/onboarding"
            className="pw-primary-btn pw-focus min-w-[10rem] px-5 text-sm"
          >
            {t("home.cta")}
          </Link>
          <Link
            href={portalHref(
              PORTAL_PATHS.agent,
              process.env.NEXT_PUBLIC_PORTAL_URL?.trim() || undefined,
            )}
            className="pw-secondary-btn pw-focus px-5 text-sm"
          >
            {t("home.portal")}
          </Link>
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {entryCards.map((entry) => (
            <Link
              key={entry.href}
              href={entry.href}
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

      <section className="grid gap-3 md:grid-cols-2" aria-label="Единая навигация">
        {roleCards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className={`group rounded-[1.7rem] border border-pathwise-line bg-gradient-to-br ${card.tone} p-5 text-left no-underline shadow-pathwise transition hover:-translate-y-0.5 hover:border-pathwise-accent hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pw-primary md:p-6`}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[0.68rem] font-bold uppercase tracking-[0.16em] text-pathwise-accent-strong">
                  {card.label}
                </p>
                <h2 className="mt-2 text-lg font-bold leading-tight text-pathwise-ink">
                  {card.title}
                </h2>
              </div>
              <span
                className="flex h-10 min-w-10 items-center justify-center rounded-full bg-pathwise-accent text-sm font-bold text-white shadow-pathwise transition group-hover:scale-105"
                aria-hidden
              >
                →
              </span>
            </div>
            <p className="mt-3 text-sm leading-6 text-pathwise-muted">{card.body}</p>
          </Link>
        ))}
      </section>

      <ContentCard className="bg-gradient-to-r from-pathwise-accent-soft via-pathwise-surface to-pathwise-surface">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <p className="max-w-3xl text-sm leading-6 text-foreground">{t("home.card")}</p>
          <Link
            href={portalHref(PORTAL_PATHS.agent, portalBase)}
            className="pw-primary-btn pw-focus shrink-0 px-4 text-sm"
          >
            Открыть AI-наставника →
          </Link>
        </div>
      </ContentCard>
    </div>
  );
}
