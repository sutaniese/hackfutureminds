"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  ROLE_ENTRY_PATHS,
  ROLE_LABELS,
  type UserRole,
} from "@/lib/site-nav";
import { useSelectedRole } from "@/components/shell/useSelectedRole";
import { useAuth } from "@/components/shell/useAuth";
import { useI18n } from "@/i18n/I18nProvider";

type EntryCard = {
  role: UserRole;
  label: string;
  title: string;
  body: string;
  badge: string;
  metric: string;
};

function buildEntryCards(t: (key: string) => string): ReadonlyArray<EntryCard> {
  const roles: UserRole[] = ["student", "parent", "teacher"];
  return roles.map((role) => ({
    role,
    label: t(`home.entry.${role}.label`),
    title: t(`home.entry.${role}.title`),
    body: t(`home.entry.${role}.body`),
    badge: t(`home.entry.${role}.badge`),
    metric: t(`home.entry.${role}.metric`),
  }));
}

export function HomeView() {
  const router = useRouter();
  const { t } = useI18n();
  const { setRole } = useSelectedRole();
  const { user, status, logout } = useAuth();
  const isAuthed = status === "authed" && Boolean(user);

  const entryCards = useMemo(() => buildEntryCards(t), [t]);

  const stats = useMemo(
    () =>
      [
        [t("home.landing.stat1v"), t("home.landing.stat1l")],
        [t("home.landing.stat2v"), t("home.landing.stat2l")],
        [t("home.landing.stat3v"), t("home.landing.stat3l")],
        [t("home.landing.stat4v"), t("home.landing.stat4l")],
      ] as const,
    [t],
  );

  const steps = useMemo(
    () =>
      [
        {
          label: t("home.landing.step1.label"),
          title: t("home.landing.step1.title"),
          body: t("home.landing.step1.body"),
        },
        {
          label: t("home.landing.step2.label"),
          title: t("home.landing.step2.title"),
          body: t("home.landing.step2.body"),
        },
        {
          label: t("home.landing.step3.label"),
          title: t("home.landing.step3.title"),
          body: t("home.landing.step3.body"),
        },
      ] as const,
    [t],
  );

  const whyItems = useMemo(
    () => [t("home.why.1"), t("home.why.2"), t("home.why.3"), t("home.why.4")] as const,
    [t],
  );

  const accountItems = useMemo(
    () =>
      [
        { title: t("home.landing.accountItem1"), tag: t("home.landing.accountTagReady"), width: 92 },
        { title: t("home.landing.accountItem2"), tag: t("home.landing.accountTagAi"), width: 74 },
        { title: t("home.landing.accountItem3"), tag: t("home.landing.accountTagAi"), width: 56 },
      ] as const,
    [t],
  );

  function handleEntryClick(card: EntryCard) {
    if (isAuthed && user) {
      setRole(card.role);
      router.push(ROLE_ENTRY_PATHS[card.role]);
      return;
    }
    router.push(
      `/register?redirect=${encodeURIComponent(ROLE_ENTRY_PATHS[card.role])}`,
    );
  }

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-10 text-[#111827]">
      <section className="relative overflow-hidden rounded-[2.5rem] border border-slate-200 bg-white px-5 py-8 shadow-[0_16px_45px_rgb(15_23_42_/_0.08)] md:px-10 md:py-12">
        <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-slate-50 " />
        <div className="pointer-events-none absolute right-10 top-16 hidden h-64 w-64 rounded-[3rem] bg-slate-50 shadow-xl md:block" />
        <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="relative z-10">
            <p className="inline-flex rounded-full bg-white px-3 py-1 text-[0.68rem] font-black uppercase tracking-[0.22em] text-[#6C63FF] shadow-sm ring-1 ring-slate-200">
              {t("home.landing.kicker")}
            </p>
            <h1 className="mt-5 max-w-3xl text-4xl font-black leading-[0.98] tracking-[-0.055em] text-[#101426] md:text-6xl">
              {t("home.landing.title")}
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-slate-600 md:text-lg">
              {t("home.landing.subtitle")}
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link
                href={isAuthed ? ROLE_ENTRY_PATHS[user?.role ?? "student"] : "/register"}
                className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#111827] px-6 text-sm font-black text-white no-underline shadow-sm transition hover:-translate-y-0.5 hover:bg-[#6C63FF]"
              >
                {t("home.landing.ctaPrimary")}
              </Link>
              <Link
                href="/grants"
                className="inline-flex min-h-12 items-center justify-center rounded-full border border-slate-200 bg-white px-6 text-sm font-black text-[#111827] no-underline shadow-sm transition hover:-translate-y-0.5 hover:border-[#6C63FF]"
              >
                {t("home.landing.ctaSecondary")}
              </Link>
            </div>

            <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {stats.map(([value, label]) => (
                <div key={label} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
                  <p className="text-2xl font-black tracking-tight text-[#6C63FF]">{value}</p>
                  <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">{label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative z-10">
            <div className="rounded-[2rem] bg-white p-4 shadow-[0_16px_45px_rgb(15_23_42_/_0.10)] ring-1 ring-slate-200">
              <div className="rounded-[1.5rem] bg-[#f8fafc] p-5 text-[#111827] ring-1 ring-slate-200">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#6C63FF]">
                      {t("home.landing.accountKicker")}
                    </p>
                    <h2 className="mt-2 text-2xl font-black tracking-tight">{t("home.landing.accountTitle")}</h2>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                    MVP
                  </span>
                </div>
                <div className="mt-6 space-y-3">
                  {accountItems.map((item) => (
                    <div key={item.title} className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
                      <div className="flex items-center justify-between text-sm font-bold">
                        <span>{item.title}</span>
                        <span className="text-[#6C63FF]">{item.tag}</span>
                      </div>
                      <div className="mt-3 h-2 rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-[#6C63FF]"
                          style={{ width: `${item.width}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-5 rounded-2xl bg-[#6C63FF] p-4 text-white">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-200/90">
                    {t("home.landing.nextKicker")}
                  </p>
                  <p className="mt-1 text-sm font-semibold">{t("home.landing.nextText")}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {steps.map((step) => (
          <article key={step.label} className="rounded-[2rem] border border-slate-200 bg-white p-6 text-[#111827] shadow-sm">
            <p className="text-[0.68rem] font-black uppercase tracking-[0.22em] text-[#6C63FF]">{step.label}</p>
            <h2 className="mt-4 text-2xl font-black tracking-tight">{step.title}</h2>
            <p className="mt-3 text-sm leading-7 text-slate-600">{step.body}</p>
          </article>
        ))}
      </section>

      <section className="rounded-[2.5rem] border border-slate-200 bg-white p-5 shadow-sm md:p-8">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[0.68rem] font-black uppercase tracking-[0.22em] text-[#6C63FF]">
              {t("home.landing.workspaceKicker")}
            </p>
            <h2 className="mt-3 text-3xl font-black tracking-[-0.04em] text-[#111827]">
              {t("home.landing.workspaceTitle")}
            </h2>
          </div>
          {isAuthed ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                {user?.name?.trim() || user?.email}
              </span>
              <span className="rounded-full bg-[#6C63FF]/10 px-3 py-1 text-xs font-bold text-[#6C63FF]">
                {user ? ROLE_LABELS[user.role] : ""}
              </span>
            </div>
          ) : null}
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          {entryCards.map((entry) => {
            const isCurrent = isAuthed && user?.role === entry.role;
            return (
              <button
                key={entry.role}
                type="button"
                onClick={() => handleEntryClick(entry)}
                className={`group relative overflow-hidden rounded-[1.75rem] border bg-white p-5 text-left no-underline shadow-sm transition hover:-translate-y-1 hover:shadow-xl ${
                  isCurrent
                    ? "border-[#6C63FF] ring-4 ring-[#6C63FF]/10"
                    : "border-slate-200 hover:border-[#6C63FF]/50"
                }`}
                aria-label={entry.label}
                aria-current={isCurrent ? "true" : undefined}
              >
                <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-[#6C63FF]/10 transition group-hover:bg-[#f1efff]" />
                <div className="relative">
                  <div className="flex items-center justify-between gap-3">
                    <span className="inline-flex rounded-full bg-[#6C63FF]/10 px-2.5 py-1 text-[0.65rem] font-black uppercase tracking-[0.14em] text-[#6C63FF]">
                      {entry.badge}
                    </span>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-600">
                      {entry.metric}
                    </span>
                  </div>
                <h3 className="mt-5 text-xl font-black leading-tight text-[#111827]">
                  {entry.title}
                </h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  {entry.body}
                </p>
                <span className="mt-5 inline-flex text-sm font-black text-[#6C63FF]">
                  {isAuthed
                    ? isCurrent
                      ? t("home.entry.open")
                      : t("home.entry.switch")
                    : t("home.entry.create")}
                </span>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <section className="grid gap-6 rounded-[2.5rem] border border-slate-200 bg-white p-6 text-[#111827] shadow-sm md:grid-cols-[0.9fr_1.1fr] md:p-8">
        <div>
          <p className="text-[0.68rem] font-black uppercase tracking-[0.22em] text-[#6C63FF]">
            {t("home.why.kicker")}
          </p>
          <h2 className="mt-3 text-3xl font-black tracking-[-0.04em]">
            {t("home.why.title")}
          </h2>
          <p className="mt-4 text-sm leading-7 text-slate-600">
            {t("home.why.lead")}
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {whyItems.map((item, index) => (
            <div key={item} className="rounded-2xl bg-[#f8fafc] p-4 ring-1 ring-slate-200">
              <span className="text-sm font-black text-[#6C63FF]">0{index + 1}</span>
              <p className="mt-3 text-sm font-semibold leading-6 text-slate-700">{item}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <p className="max-w-3xl text-sm leading-7 text-slate-600">
            {isAuthed ? t("home.landing.footerAuthed") : t("home.landing.footerGuest")}
          </p>
          {isAuthed ? (
            <button
              type="button"
              onClick={logout}
              className="inline-flex min-h-12 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white px-5 text-sm font-black text-[#111827] shadow-sm transition hover:border-[#FF6B6B] hover:text-[#FF6B6B]"
            >
              {t("home.landing.logout")}
            </button>
          ) : (
            <Link
              href="/register"
              className="inline-flex min-h-12 shrink-0 items-center justify-center rounded-full bg-[#6C63FF] px-5 text-sm font-black text-white no-underline shadow-sm transition hover:-translate-y-0.5"
            >
              {t("home.landing.register")}
            </Link>
          )}
        </div>
      </section>
    </div>
  );
}
