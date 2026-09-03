import type { Grade, Subject, Task, Topic } from "../types";
import { MATH_TOPICS } from "./math";
import { PHYSICS_TOPICS } from "./physics";
import { INFORMATICS_TOPICS } from "./informatics";
import { BIOLOGY_TOPICS, CHEMISTRY_TOPICS } from "./science";
import { ENGLISH_TOPICS, HISTORY_TOPICS } from "./humanities";

export const SUBJECTS: readonly Subject[] = [
  {
    id: "math",
    title: "Математика",
    mark: "∑",
    description: "Алгебра, прогрессии и вероятность — ядро подготовки к ЕНТ.",
    accent: "#6C63FF",
  },
  {
    id: "physics",
    title: "Физика",
    mark: "◈",
    description: "Кинематика, динамика и электричество с разбором формул.",
    accent: "#43D19E",
  },
  {
    id: "informatics",
    title: "Информатика",
    mark: "◆",
    description: "Алгоритмы, Python и системы счисления с живыми примерами.",
    accent: "#FF6B6B",
  },
  {
    id: "chemistry",
    title: "Химия",
    mark: "●",
    description: "Строение атома и химические реакции с уравниванием.",
    accent: "#F59E0B",
  },
  {
    id: "biology",
    title: "Биология",
    mark: "✦",
    description: "Клетка и генетика — темы, которые чаще всего западают.",
    accent: "#0EA5E9",
  },
  {
    id: "history-kz",
    title: "История Казахстана",
    mark: "▣",
    description: "От Казахского ханства до современного Казахстана.",
    accent: "#8B5CF6",
  },
  {
    id: "english",
    title: "English",
    mark: "★",
    description: "Времена глагола и понимание текста для теста и поступления.",
    accent: "#EC4899",
  },
] as const;

/** Базовый каталог MVP. Темы учителя добавляются поверх него в `store.ts`. */
export const BASE_TOPICS: readonly Topic[] = [
  ...MATH_TOPICS,
  ...PHYSICS_TOPICS,
  ...INFORMATICS_TOPICS,
  ...CHEMISTRY_TOPICS,
  ...BIOLOGY_TOPICS,
  ...HISTORY_TOPICS,
  ...ENGLISH_TOPICS,
];

export function findSubject(subjectId: string): Subject | null {
  return SUBJECTS.find((subject) => subject.id === subjectId) ?? null;
}

export function subjectTitle(subjectId: string): string {
  return findSubject(subjectId)?.title ?? subjectId;
}

export function topicsForSubject(topics: readonly Topic[], subjectId: string): Topic[] {
  return topics.filter((topic) => topic.subjectId === subjectId);
}

export function topicsForGrade(topics: readonly Topic[], grade: Grade): Topic[] {
  return topics.filter((topic) => topic.grades.includes(grade));
}

export function findTopic(topics: readonly Topic[], topicId: string): Topic | null {
  return topics.find((topic) => topic.id === topicId) ?? null;
}

export function findTask(topics: readonly Topic[], taskId: string): Task | null {
  for (const topic of topics) {
    const task = topic.tasks.find((item) => item.id === taskId);
    if (task) return task;
  }
  return null;
}

export function allTasks(topics: readonly Topic[]): Task[] {
  return topics.flatMap((topic) => topic.tasks);
}

export { MATH_TOPICS, PHYSICS_TOPICS, INFORMATICS_TOPICS, CHEMISTRY_TOPICS, BIOLOGY_TOPICS, HISTORY_TOPICS, ENGLISH_TOPICS };
