import { DEFAULT_LOCALE, type Locale } from "@/i18n/locales";
import { tFor } from "@/i18n/messageTable";
import type { Recommendation, WeakSpot } from "./recommend";
import type { Task, Topic } from "./types";

/**
 * One-sentence “why this” for a recommended topic or a specific task.
 * Ranking still comes from the deterministic engine; this only explains it.
 */
export function whyThisTopic(
  item: Recommendation,
  weak: readonly WeakSpot[],
  locale: Locale = DEFAULT_LOCALE,
): string {
  const gap = weak.find((spot) => spot.topicId === item.topic.id);
  if (gap) {
    return tFor(locale, "why.gap", { skill: gap.skill, n: gap.accuracy });
  }
  if (item.topic.custom) {
    return tFor(locale, "why.custom");
  }
  return item.reason.endsWith(".") ? item.reason : `${item.reason}.`;
}

export function whyThisTask(
  task: Task,
  topic: Topic,
  weak: readonly WeakSpot[],
  locale: Locale = DEFAULT_LOCALE,
): string {
  const gap = weak.find((spot) => spot.skill === task.skill || spot.topicId === topic.id);
  if (gap) {
    return tFor(locale, "why.taskGap", { skill: task.skill, n: gap.accuracy });
  }
  return tFor(locale, "why.taskNext", { title: topic.title, skill: task.skill, n: task.difficulty });
}
