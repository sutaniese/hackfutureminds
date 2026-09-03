"use client";

import Link from "next/link";
import { useI18n } from "@/i18n/I18nProvider";
import type { Locale } from "@/i18n/locales";
import { localizedCount } from "@/lib/i18n-labels";
import type { ReviewItem } from "@/lib/learning/recommend";
import { Pill } from "./LearningUI";

type Reminder = {
  id: string;
  tone: "warn" | "accent" | "good";
  title: string;
  body: string;
  href: string;
  action: string;
};

type Translate = (key: string, params?: Record<string, string | number>) => string;

function buildReminders(
  days: number | null,
  reviews: readonly ReviewItem[],
  t: Translate,
  locale: Locale,
): Reminder[] {
  const list: Reminder[] = [];

  if (days !== null && days >= 0 && days <= 30) {
    list.push({
      id: "exam",
      tone: days <= 14 ? "warn" : "accent",
      title: days === 0 ? t("remind.exam0") : t("remind.examN", { days: localizedCount(locale, "days", days) }),
      body: days <= 14 ? t("remind.examSoon") : t("remind.examOk"),
      href: "#plan",
      action: t("remind.toPlan"),
    });
  }

  const due = reviews.filter((item) => item.urgency === "due");
  if (due.length > 0) {
    list.push({
      id: "review",
      tone: "accent",
      title: t("remind.reviewTitle", { topics: localizedCount(locale, "topics", due.length) }),
      body: t("remind.reviewBody", {
        title: due[0].topic.title,
        days: localizedCount(locale, "days", due[0].daysSince),
      }),
      href: `/learning/topic/${due[0].topic.id}`,
      action: t("remind.review"),
    });
  }

  return list;
}

const TONE_CLASS: Record<Reminder["tone"], string> = {
  warn: "border-[#FF6B6B]/40 bg-[#FF6B6B]/10",
  accent: "border-[#6C63FF]/35 bg-[#6C63FF]/8",
  good: "border-emerald-400/40 bg-emerald-500/10",
};

/** Напоминания о дедлайне цели и о темах, которые пора повторить. */
export function ReminderBanner({
  days,
  reviews,
}: {
  days: number | null;
  reviews: readonly ReviewItem[];
}) {
  const { t, locale } = useI18n();
  const reminders = buildReminders(days, reviews, t, locale);
  if (reminders.length === 0) return null;

  return (
    <section className="grid gap-3 md:grid-cols-2" aria-label={t("remind.aria")}>
      {reminders.map((reminder) => (
        <article
          key={reminder.id}
          className={`rounded-[1.5rem] border p-4 md:p-5 ${TONE_CLASS[reminder.tone]}`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-base font-black text-pathwise-ink">{reminder.title}</p>
            <Pill tone={reminder.tone === "warn" ? "warn" : "accent"}>{t("remind.pill")}</Pill>
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-700">{reminder.body}</p>
          <Link
            href={reminder.href}
            className="mt-3 inline-flex text-sm font-black text-[#554dd6] no-underline"
          >
            {reminder.action} →
          </Link>
        </article>
      ))}
    </section>
  );
}
