"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ROLE_ENTRY_PATHS,
  ROLE_LABEL_KEYS,
  type UserRole,
} from "@/lib/site-nav";
import { useAuth } from "@/components/shell/useAuth";
import { useI18n } from "@/i18n/I18nProvider";
import { profileHref } from "@/lib/profile-slug";
import { AnimatedNumber } from "@/components/motion/AnimatedNumber";
import { studentContinuePath } from "@/lib/student-progress";
import { canAccessUniversityLayer } from "@pathwise/shared";
import { useLearning } from "@/components/learning/useLearning";

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
  const { user, status, logout } = useAuth();
  const { profile } = useLearning();
  const isAuthed = status === "authed" && Boolean(user);
  const showGrants = canAccessUniversityLayer(profile?.grade);

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

  const learnSteps = useMemo(
    () =>
      ([1, 2, 3, 4] as const).map((step) => ({
        step,
        title: t(`home.learn.s${step}.title`),
        body: t(`home.learn.s${step}.body`),
      })),
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

  useEffect(() => {
    if (!isAuthed || !user) return;
    if (user.role === "student") return;
    router.replace(ROLE_ENTRY_PATHS[user.role]);
  }, [isAuthed, router, user]);

  function handleEntryClick(card: EntryCard) {
    if (isAuthed && user) {
      // Stay on the account role — do not silently become a student.
      router.push(ROLE_ENTRY_PATHS[user.role === card.role ? card.role : user.role]);
      return;
    }
    router.push(
      `/register?redirect=${encodeURIComponent(ROLE_ENTRY_PATHS[card.role])}`,
    );
  }

  const [studentHome, setStudentHome] = useState("/onboarding");
  useEffect(() => {
    if (isAuthed && user?.role === "student") setStudentHome(studentContinuePath());
  }, [isAuthed, user]);
  const authedHome = isAuthed && user
    ? (user.role === "student" ? studentHome : ROLE_ENTRY_PATHS[user.role])
    : null;

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

            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link
                href={authedHome ?? "/register?redirect=%2Flearning"}
                className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#111827] px-6 text-sm font-black text-white no-underline shadow-sm transition hover:-translate-y-0.5 hover:bg-[#6C63FF]"
              >
                {t("home.landing.ctaPrimary")}
              </Link>
              <Link
                href={
                  authedHome ?? "/register?redirect=%2Flearning%2Fdiagnostics"
                }
                className="inline-flex min-h-12 items-center justify-center rounded-full border border-[#6C63FF] bg-[#6C63FF]/10 px-6 text-sm font-black text-[#554dd6] no-underline shadow-sm transition hover:-translate-y-0.5 hover:bg-[#6C63FF]/15"
              >
                {t("home.landing.ctaSecondary")}
              </Link>
              {showGrants ? (
              <Link
                href="/grants"
                className="inline-flex min-h-12 items-center justify-center rounded-full border border-slate-200 bg-white px-6 text-sm font-black text-[#111827] no-underline shadow-sm transition hover:-translate-y-0.5 hover:border-[#6C63FF]"
              >
                {t("home.landing.ctaGrants")}
              </Link>
              ) : null}
              {isAuthed && user?.email ? (
                <Link
                  href={profileHref(user.email)}
                  className="inline-flex min-h-12 items-center justify-center rounded-full border border-[#6C63FF]/35 bg-[#6C63FF]/10 px-6 text-sm font-black text-[#554dd6] no-underline shadow-sm transition hover:-translate-y-0.5 hover:bg-[#6C63FF]/15"
                >
                  {t("home.profileCta")}
                </Link>
              ) : null}
            </div>

            <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {stats.map(([value, label], index) => {
                const numeric = Number(value);
                return (
                  <div
                    key={label}
                    style={{ "--d": `${index * 90 + 120}ms` } as React.CSSProperties}
                    className="pw-reveal rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 transition duration-300 hover:-translate-y-1 hover:ring-[#6C63FF]/40"
                  >
                    <p className="text-2xl font-black tracking-tight text-[#6C63FF]">
                      {Number.isFinite(numeric) && value.trim() !== "" ? (
                        <AnimatedNumber value={numeric} delay={index * 90 + 300} duration={1000} />
                      ) : (
                        value
                      )}
                    </p>
                    <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">{label}</p>
                  </div>
                );
              })}
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

      <section className="rounded-[2.5rem] border border-slate-200 bg-white p-5 shadow-sm md:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-[0.68rem] font-black uppercase tracking-[0.22em] text-[#6C63FF]">
              {t("home.learn.kicker")}
            </p>
            <h2 className="mt-3 text-3xl font-black tracking-[-0.04em] text-[#111827]">
              {t("home.learn.title")}
            </h2>
            <p className="mt-3 text-sm leading-7 text-slate-600">{t("home.learn.lead")}</p>
          </div>
          <Link
            href={
              isAuthed ? "/learning/diagnostics" : "/register?redirect=%2Flearning%2Fdiagnostics"
            }
            className="inline-flex min-h-12 shrink-0 items-center justify-center rounded-full bg-[#6C63FF] px-6 text-sm font-black text-white no-underline shadow-sm transition hover:-translate-y-0.5"
          >
            {t("home.landing.ctaSecondary")}
          </Link>
        </div>

        <div className="mt-7 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {learnSteps.map((item) => (
            <article
              key={item.step}
              style={{ "--d": `${(item.step - 1) * 100}ms` } as React.CSSProperties}
              className="pw-reveal relative overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white p-5 transition duration-300 hover:-translate-y-1 hover:border-[#6C63FF]/40 hover:shadow-lg"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#6C63FF] text-base font-black text-white">
                {item.step}
              </span>
              <h3 className="mt-4 text-lg font-black leading-tight text-[#111827]">{item.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{item.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {steps.map((step, index) => (
          <article
            key={step.label}
            style={{ "--d": `${index * 100}ms` } as React.CSSProperties}
            className="pw-reveal rounded-[2rem] border border-slate-200 bg-white p-6 text-[#111827] shadow-sm transition duration-300 hover:-translate-y-1 hover:border-[#6C63FF]/40 hover:shadow-lg"
          >
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
                {user ? t(ROLE_LABEL_KEYS[user.role]) : ""}
              </span>
            </div>
          ) : null}
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          {entryCards.map((entry, index) => {
            const isCurrent = isAuthed && user?.role === entry.role;
            return (
              <button
                key={entry.role}
                type="button"
                onClick={() => handleEntryClick(entry)}
                style={{ "--d": `${index * 100}ms` } as React.CSSProperties}
                className={`pw-reveal pw-press group relative overflow-hidden rounded-[1.75rem] border bg-white p-5 text-left no-underline shadow-sm hover:-translate-y-1 hover:shadow-xl ${
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
