import type { Locale } from "@/i18n/locales";
import { tFor } from "@/i18n/messageTable";
import { attemptsLabel, daysLabel, studentsLabel, tasksLabel, topicsLabel, withPlural } from "@/lib/learning/plural";
import type { LearningGoalId } from "@/lib/learning/types";
import type { UserRole } from "@/lib/site-nav";

export function goalLabel(t: (k: string) => string, id: LearningGoalId | string): string {
  return t(`goal.${id}`);
}

export function roleLabel(t: (k: string) => string, role: UserRole): string {
  return t(`role.${role}`);
}

export function levelLabelI18n(t: (k: string) => string, level: 1 | 2 | 3 | 4): string {
  return t(`level.${level}`);
}

export function difficultyLabelI18n(t: (k: string) => string, d: 1 | 2 | 3): string {
  return t(`difficulty.${d}`);
}

export function localizedCount(
  locale: Locale,
  kind: "attempts" | "tasks" | "topics" | "students" | "days",
  count: number,
): string {
  if (locale === "ru") {
    if (kind === "attempts") return attemptsLabel(count);
    if (kind === "tasks") return tasksLabel(count);
    if (kind === "topics") return topicsLabel(count);
    if (kind === "students") return studentsLabel(count);
    return daysLabel(count);
  }
  return tFor(locale, `plural.${kind}.${locale === "kk" ? "kk" : "en"}`, { n: count });
}

export function ofTasksI18n(locale: Locale, count: number): string {
  if (locale === "ru") {
    return `${count} ${count % 10 === 1 && count % 100 !== 11 ? "задания" : "заданий"}`;
  }
  return localizedCount(locale, "tasks", count);
}

export function withRuPlural(count: number, one: string, few: string, many: string): string {
  return withPlural(count, one, few, many);
}
