import { topicsForSubject } from "./catalog";
import { daysLabel, tasksLabel } from "./plural";
import { emptyTopicState } from "./empty-state";
import type { DiagnosticResult, LearningProfile, LearningState, ScorePair, TopicState } from "./store";
import type { Difficulty, Grade, Task, Topic } from "./types";

/**
 * Модуль персонализации: диагностика → уровень → рекомендации тем,
 * адаптивная сложность заданий и план подготовки под цель ученика.
 *
 * Всё считается детерминированно на клиенте, поэтому демо работает
 * даже без ключа AI. AI-слой (`/api/learning/*`) дополняет эти данные
 * объяснениями и текстом плана.
 */

export const DIAGNOSTIC_SIZE = 8;

/* ------------------------------ диагностика ----------------------------- */

/** Насколько тема далека от класса ученика — 0, если класс входит в тему. */
function gradeDistance(topic: Topic, grade: Grade): number {
  return Math.min(...topic.grades.map((item) => Math.abs(item - grade)));
}

/**
 * Пул заданий для диагностики: сначала темы своего класса. Если их не хватает
 * на весь тест (например, у 11 класса по предмету одна профильная тема),
 * добираем ближайшими классами — база прошлых лет тоже входит в ЕНТ.
 */
export function diagnosticPool(topics: readonly Topic[], subjectId: string, grade: Grade): Task[] {
  const subjectTopics = topicsForSubject(topics, subjectId);
  const primary = subjectTopics
    .filter((topic) => topic.grades.includes(grade))
    .flatMap((topic) => topic.tasks);

  if (primary.length >= DIAGNOSTIC_SIZE) return primary;

  const extra = subjectTopics
    .filter((topic) => !topic.grades.includes(grade))
    .sort((a, b) => gradeDistance(a, grade) - gradeDistance(b, grade))
    .flatMap((topic) => topic.tasks);

  return [...primary, ...extra];
}

/** Следующий уровень сложности по правилу «верно — сложнее, неверно — легче». */
export function nextDifficulty(current: Difficulty, correct: boolean): Difficulty {
  if (correct) return Math.min(3, current + 1) as Difficulty;
  return Math.max(1, current - 1) as Difficulty;
}

/**
 * Выбирает следующий вопрос диагностики: нужная сложность и тема,
 * по которой задано меньше всего вопросов.
 */
export function pickNextDiagnostic(
  pool: readonly Task[],
  askedIds: readonly string[],
  targetDifficulty: Difficulty,
): Task | null {
  const asked = new Set(askedIds);
  const available = pool.filter((task) => !asked.has(task.id));
  if (available.length === 0) return null;

  const perTopic = new Map<string, number>();
  for (const id of askedIds) {
    const task = pool.find((item) => item.id === id);
    if (!task) continue;
    perTopic.set(task.topicId, (perTopic.get(task.topicId) ?? 0) + 1);
  }

  const sorted = [...available].sort((a, b) => {
    const byDifficulty =
      Math.abs(a.difficulty - targetDifficulty) - Math.abs(b.difficulty - targetDifficulty);
    if (byDifficulty !== 0) return byDifficulty;
    const countA = perTopic.get(a.topicId) ?? 0;
    const countB = perTopic.get(b.topicId) ?? 0;
    if (countA !== countB) return countA - countB;
    return a.id.localeCompare(b.id);
  });

  return sorted[0] ?? null;
}

function bump(map: Record<string, ScorePair>, key: string, correct: boolean): void {
  const current = map[key] ?? { correct: 0, total: 0 };
  map[key] = { correct: current.correct + (correct ? 1 : 0), total: current.total + 1 };
}

export type DiagnosticRecord = { task: Task; correct: boolean };

/** Итог диагностики: уровень считается с весом сложности заданий. */
export function evaluateDiagnostic(
  subjectId: string,
  grade: Grade,
  records: readonly DiagnosticRecord[],
): DiagnosticResult {
  const byTopic: Record<string, ScorePair> = {};
  const bySkill: Record<string, ScorePair> = {};
  let weighted = 0;
  let weightTotal = 0;
  let correct = 0;

  for (const record of records) {
    bump(byTopic, record.task.topicId, record.correct);
    bump(bySkill, record.task.skill, record.correct);
    weightTotal += record.task.difficulty;
    if (record.correct) {
      weighted += record.task.difficulty;
      correct += 1;
    }
  }

  const ratio = weightTotal > 0 ? weighted / weightTotal : 0;
  const level: DiagnosticResult["level"] =
    ratio >= 0.82 ? 4 : ratio >= 0.6 ? 3 : ratio >= 0.35 ? 2 : 1;

  return {
    subjectId,
    grade,
    total: records.length,
    correct,
    level,
    byTopic,
    bySkill,
    at: Date.now(),
  };
}

/* ------------------------------ прогресс тем ---------------------------- */

export function topicStateOf(state: LearningState, topicId: string): TopicState {
  return state.topics[topicId] ?? emptyTopicState(topicId);
}

/** Доля решённых заданий темы, %. */
export function topicMastery(topic: Topic, state: LearningState): number {
  if (topic.tasks.length === 0) return 0;
  const solved = topicStateOf(state, topic.id).solved.length;
  return Math.round((Math.min(solved, topic.tasks.length) / topic.tasks.length) * 100);
}

export function topicAccuracy(topic: Topic, state: LearningState): number | null {
  const topicState = topicStateOf(state, topic.id);
  if (topicState.attempts === 0) return null;
  return Math.round((topicState.correct / topicState.attempts) * 100);
}

export function isTopicComplete(topic: Topic, state: LearningState): boolean {
  return topic.tasks.length > 0 && topicMastery(topic, state) >= 100;
}

/** Следующее задание темы: сначала нерешённые нужного уровня, затем ближайшие. */
export function nextTask(topic: Topic, state: LearningState): Task | null {
  const topicState = topicStateOf(state, topic.id);
  const solved = new Set(topicState.solved);
  const available = topic.tasks.filter((task) => !solved.has(task.id));
  if (available.length === 0) return null;

  const target = topicState.difficulty;
  const sorted = [...available].sort((a, b) => {
    const byDifficulty = Math.abs(a.difficulty - target) - Math.abs(b.difficulty - target);
    if (byDifficulty !== 0) return byDifficulty;
    return a.difficulty - b.difficulty;
  });
  return sorted[0] ?? null;
}

/* ------------------------------ слабые места ---------------------------- */

export type WeakSpot = {
  skill: string;
  topicId: string;
  topicTitle: string;
  accuracy: number;
  attempts: number;
};

/** Навыки с точностью ниже 70% — по диагностике и по решённым заданиям. */
export function weakSpots(
  topics: readonly Topic[],
  state: LearningState,
  limit = 5,
): WeakSpot[] {
  const bySkill = new Map<string, { correct: number; total: number; topicId: string }>();

  const add = (skill: string, topicId: string, correct: boolean) => {
    const current = bySkill.get(skill) ?? { correct: 0, total: 0, topicId };
    bySkill.set(skill, {
      correct: current.correct + (correct ? 1 : 0),
      total: current.total + 1,
      topicId: current.topicId,
    });
  };

  if (state.diagnostic) {
    for (const [skill, score] of Object.entries(state.diagnostic.bySkill)) {
      const topic = topics.find((item) => item.skills.includes(skill));
      for (let i = 0; i < score.total; i += 1) {
        add(skill, topic?.id ?? "", i < score.correct);
      }
    }
  }

  for (const attempt of state.attempts) {
    add(attempt.skill, attempt.topicId, attempt.correct);
  }

  const spots: WeakSpot[] = [];
  for (const [skill, score] of bySkill.entries()) {
    if (score.total === 0) continue;
    const accuracy = Math.round((score.correct / score.total) * 100);
    if (accuracy >= 70) continue;
    const topic = topics.find((item) => item.id === score.topicId);
    spots.push({
      skill,
      topicId: score.topicId,
      topicTitle: topic?.title ?? "",
      accuracy,
      attempts: score.total,
    });
  }

  return spots.sort((a, b) => a.accuracy - b.accuracy || b.attempts - a.attempts).slice(0, limit);
}

/* ----------------------------- рекомендации ----------------------------- */

export type Priority = "high" | "medium" | "low";

export type Recommendation = {
  topic: Topic;
  score: number;
  priority: Priority;
  reason: string;
  mastery: number;
};

const PRIORITY_LABELS: Record<Priority, string> = {
  high: "Срочно",
  medium: "На этой неделе",
  low: "Позже",
};

export function priorityLabel(priority: Priority): string {
  return PRIORITY_LABELS[priority];
}

/**
 * Ранжирование тем: слабый результат диагностики и нерешённые задания
 * поднимают тему вверх, соответствие классу и цели добавляет вес.
 */
export function recommendTopics(
  topics: readonly Topic[],
  profile: LearningProfile | null,
  state: LearningState,
  limit = 6,
): Recommendation[] {
  if (!profile) return [];

  const subjectTopics = topicsForSubject(topics, profile.subjectId);
  const goals = new Set(profile.goals);

  const scored = subjectTopics.map((topic) => {
    const mastery = topicMastery(topic, state);
    const diagnostic = state.diagnostic?.byTopic[topic.id];
    const reasons: string[] = [];
    let score = 40;

    if (diagnostic && diagnostic.total > 0) {
      const accuracy = diagnostic.correct / diagnostic.total;
      score += Math.round((1 - accuracy) * 45);
      if (accuracy < 0.5) {
        reasons.push(`диагностика показала пробел (${diagnostic.correct} из ${diagnostic.total})`);
      } else if (accuracy < 1) {
        reasons.push("на диагностике были ошибки в этой теме");
      }
    } else {
      score += 12;
      reasons.push("тема ещё не проверялась диагностикой");
    }

    score += Math.round((100 - mastery) * 0.25);
    if (mastery === 0) reasons.push("задания ещё не решались");
    else if (mastery < 100) reasons.push(`пройдено ${mastery}% заданий`);

    if (topic.grades.includes(profile.grade)) {
      score += 15;
      reasons.push(`подходит для ${profile.grade} класса`);
    } else {
      score -= 10;
      const ahead = topic.grades.every((grade) => grade > profile.grade);
      reasons.push(ahead ? "программа старших классов" : "материал прошлых классов");
    }

    if (goals.has("olympiad") && topic.tasks.some((task) => task.difficulty === 3)) {
      score += 8;
      reasons.push("есть задания олимпиадного уровня");
    }
    if (goals.has("ent") && topic.grades.some((grade) => grade >= 10)) {
      score += 8;
      reasons.push("входит в программу ЕНТ");
    }
    if (topic.custom) {
      score += 6;
      reasons.push("тему добавил учитель");
    }
    if (mastery >= 100) score -= 60;

    const priority: Priority = score >= 95 ? "high" : score >= 70 ? "medium" : "low";

    return {
      topic,
      score,
      priority,
      mastery,
      reason: reasons.slice(0, 2).join(" · ") || "рекомендовано по профилю",
    };
  });

  return scored.sort((a, b) => b.score - a.score).slice(0, limit);
}

/* ---------------------------- повторение тем ---------------------------- */

export type ReviewItem = {
  topic: Topic;
  daysSince: number;
  intervalDays: number;
  mastery: number;
  urgency: "due" | "soon";
};

/**
 * Интервал повторения зависит от того, насколько уверенно тема закрыта:
 * слабую тему возвращаем через 3 дня, освоенную — через неделю.
 */
export function reviewIntervalDays(mastery: number): number {
  if (mastery >= 100) return 7;
  if (mastery >= 60) return 5;
  return 3;
}

/** Темы, к которым пора вернуться: простое интервальное повторение. */
export function reviewQueue(
  topics: readonly Topic[],
  profile: LearningProfile | null,
  state: LearningState,
  now: number = Date.now(),
): ReviewItem[] {
  const scope = profile ? topicsForSubject(topics, profile.subjectId) : [...topics];

  const items: ReviewItem[] = [];
  for (const topic of scope) {
    const topicState = topicStateOf(state, topic.id);
    if (topicState.attempts === 0 || topicState.lastAt === 0) continue;

    const daysSince = Math.floor((now - topicState.lastAt) / 86_400_000);
    const mastery = topicMastery(topic, state);
    const intervalDays = reviewIntervalDays(mastery);
    if (daysSince < intervalDays - 1) continue;

    items.push({
      topic,
      daysSince,
      intervalDays,
      mastery,
      urgency: daysSince >= intervalDays ? "due" : "soon",
    });
  }

  return items.sort((a, b) => b.daysSince - a.daysSince);
}

/* -------------------------------- план ---------------------------------- */

export function daysUntil(dateIso: string | undefined): number | null {
  if (!dateIso) return null;
  const target = new Date(`${dateIso}T00:00:00`);
  if (Number.isNaN(target.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

export type PlanWeek = {
  index: number;
  title: string;
  topicIds: string[];
  goals: string[];
};

export type StudyPlan = {
  headline: string;
  minutesPerDay: number;
  weeks: PlanWeek[];
  source: "local" | "ai";
};

/** Детерминированный план подготовки — работает без ключа AI. */
export function buildStudyPlan(
  topics: readonly Topic[],
  profile: LearningProfile | null,
  state: LearningState,
): StudyPlan | null {
  if (!profile) return null;

  const ranked = recommendTopics(topics, profile, state, 8);
  if (ranked.length === 0) return null;

  const days = daysUntil(profile.examDate);
  const weeksCount = days && days > 0 ? Math.max(1, Math.min(6, Math.ceil(days / 7))) : 4;
  const perWeek = Math.max(1, Math.ceil(ranked.length / weeksCount));

  const weeks: PlanWeek[] = [];
  for (let index = 0; index < weeksCount; index += 1) {
    const slice = ranked.slice(index * perWeek, (index + 1) * perWeek);
    if (slice.length === 0) break;
    weeks.push({
      index: index + 1,
      title: slice.map((item) => item.topic.title).join(" · "),
      topicIds: slice.map((item) => item.topic.id),
      goals: [
        `Разобрать конспект: ${slice[0].topic.title}`,
        `Решить ${tasksLabel(slice.reduce((sum, item) => sum + item.topic.tasks.length, 0))} и закрыть ошибки`,
        index === weeksCount - 1
          ? "Пройти диагностику ещё раз и сравнить уровень"
          : "Повторить слабые навыки прошлой недели",
      ],
    });
  }

  const headline = days && days > 0
    ? `До цели ${daysLabel(days)} — план на ${weeks.length} нед. по ${profile.minutesPerDay} мин в день`
    : `План на ${weeks.length} нед. по ${profile.minutesPerDay} мин в день`;

  return { headline, minutesPerDay: profile.minutesPerDay, weeks, source: "local" };
}

/* ------------------------------ сводка ---------------------------------- */

export type LearningSummary = {
  solvedTasks: number;
  totalTasks: number;
  mastery: number;
  accuracy: number | null;
  attempts: number;
  activeTopics: number;
  completedTopics: number;
};

export function learningSummary(
  topics: readonly Topic[],
  profile: LearningProfile | null,
  state: LearningState,
): LearningSummary {
  const scope = profile ? topicsForSubject(topics, profile.subjectId) : [...topics];
  const totalTasks = scope.reduce((sum, topic) => sum + topic.tasks.length, 0);
  const solvedTasks = scope.reduce(
    (sum, topic) => sum + Math.min(topicStateOf(state, topic.id).solved.length, topic.tasks.length),
    0,
  );
  const attempts = scope.reduce((sum, topic) => sum + topicStateOf(state, topic.id).attempts, 0);
  const correct = scope.reduce((sum, topic) => sum + topicStateOf(state, topic.id).correct, 0);

  return {
    solvedTasks,
    totalTasks,
    mastery: totalTasks > 0 ? Math.round((solvedTasks / totalTasks) * 100) : 0,
    accuracy: attempts > 0 ? Math.round((correct / attempts) * 100) : null,
    attempts,
    activeTopics: scope.filter((topic) => topicStateOf(state, topic.id).attempts > 0).length,
    completedTopics: scope.filter((topic) => isTopicComplete(topic, state)).length,
  };
}
