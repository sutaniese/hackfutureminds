import type { Recommendation, WeakSpot } from "./recommend";
import type { Task, Topic } from "./types";

/**
 * One-sentence “why this” for a recommended topic or a specific task.
 * Ranking still comes from the deterministic engine; this only explains it.
 */
export function whyThisTopic(item: Recommendation, weak: readonly WeakSpot[]): string {
  const gap = weak.find((spot) => spot.topicId === item.topic.id);
  if (gap) {
    return `Пробел по навыку «${gap.skill}» (${gap.accuracy}%) — эта тема закрывает его заданиями своего класса.`;
  }
  if (item.topic.custom) {
    return `Учитель опубликовал эту тему для класса — она появилась в плане сразу после публикации.`;
  }
  return item.reason.endsWith(".") ? item.reason : `${item.reason}.`;
}

export function whyThisTask(task: Task, topic: Topic, weak: readonly WeakSpot[]): string {
  const gap = weak.find((spot) => spot.skill === task.skill || spot.topicId === topic.id);
  if (gap) {
    return `Навык «${task.skill}» просел (${gap.accuracy}%) — это задание как раз его тренирует.`;
  }
  return `Следующий шаг по теме «${topic.title}»: навык «${task.skill}», сложность ${task.difficulty}.`;
}
