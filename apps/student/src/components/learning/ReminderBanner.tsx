"use client";

import Link from "next/link";
import { daysLabel, topicsLabel } from "@/lib/learning/plural";
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

function buildReminders(days: number | null, reviews: readonly ReviewItem[]): Reminder[] {
  const list: Reminder[] = [];

  if (days !== null && days >= 0 && days <= 30) {
    list.push({
      id: "exam",
      tone: days <= 14 ? "warn" : "accent",
      title: days === 0 ? "Экзамен сегодня" : `До цели ${daysLabel(days)}`,
      body:
        days <= 14
          ? "Времени мало: сначала закрывай темы из блока «Слабые места», остальное — по плану."
          : "Держи темп по плану подготовки — так к дате не останется несделанных тем.",
      href: "#plan",
      action: "К плану",
    });
  }

  const due = reviews.filter((item) => item.urgency === "due");
  if (due.length > 0) {
    list.push({
      id: "review",
      tone: "accent",
      title: `Пора повторить: ${topicsLabel(due.length)}`,
      body: `Дольше всего не открывалась тема «${due[0].topic.title}» — ${daysLabel(due[0].daysSince)} назад. Повторение закрепляет результат.`,
      href: `/learning/topic/${due[0].topic.id}`,
      action: "Повторить",
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
  const reminders = buildReminders(days, reviews);
  if (reminders.length === 0) return null;

  return (
    <section className="grid gap-3 md:grid-cols-2" aria-label="Напоминания">
      {reminders.map((reminder) => (
        <article
          key={reminder.id}
          className={`rounded-[1.5rem] border p-4 md:p-5 ${TONE_CLASS[reminder.tone]}`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-base font-black text-pathwise-ink">{reminder.title}</p>
            <Pill tone={reminder.tone === "warn" ? "warn" : "accent"}>Напоминание</Pill>
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
