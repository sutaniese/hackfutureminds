import { BASE_TOPICS } from "./catalog";
import type { Difficulty, Grade, LearningGoalId, Topic } from "./types";

/**
 * Хранилище учебного прогресса — localStorage, как и остальной state
 * платформы (аккаунты, профили, геймификация). Backend появится позже,
 * контракт функций при этом не изменится.
 */

export const LEARNING_PROFILE_KEY = "ten-learning-profile";
export const LEARNING_STATE_KEY = "ten-learning-state";
export const LEARNING_CUSTOM_KEY = "ten-learning-custom-content";
export const LEARNING_ROSTER_KEY = "ten-learning-roster";
export const LEARNING_EVENT = "ten-learning-changed";

export type LearningProfile = {
  grade: Grade;
  subjectId: string;
  goals: LearningGoalId[];
  /** Дата экзамена или дедлайна цели, формат YYYY-MM-DD. */
  examDate?: string;
  minutesPerDay: number;
  updatedAt: number;
};

export type Attempt = {
  taskId: string;
  topicId: string;
  skill: string;
  difficulty: Difficulty;
  correct: boolean;
  answer: string;
  at: number;
};

export type ScorePair = { correct: number; total: number };

export type DiagnosticResult = {
  subjectId: string;
  grade: Grade;
  total: number;
  correct: number;
  /** 1 — начальный, 4 — продвинутый. */
  level: 1 | 2 | 3 | 4;
  byTopic: Record<string, ScorePair>;
  bySkill: Record<string, ScorePair>;
  at: number;
};

export type TopicState = {
  topicId: string;
  /** id заданий, решённых верно. */
  solved: string[];
  attempts: number;
  correct: number;
  /** Текущий адаптивный уровень сложности. */
  difficulty: Difficulty;
  /** Серия верных ответов подряд на текущем уровне. */
  streak: number;
  lastAt: number;
};

export type LearningState = {
  diagnostic: DiagnosticResult | null;
  topics: Record<string, TopicState>;
  /** Последние попытки — для ленты активности и слабых мест. */
  attempts: Attempt[];
};

export type StudentLearningSnapshot = {
  email: string;
  name?: string;
  grade: Grade;
  subjectId: string;
  goals: LearningGoalId[];
  level: 1 | 2 | 3 | 4;
  /** Доля пройденных заданий по выбранному предмету, %. */
  mastery: number;
  /** Доля верных ответов, %. */
  accuracy: number;
  solvedTasks: number;
  weakTopics: string[];
  updatedAt: number;
  /** Демо-ученик из посева — чтобы панель учителя не была пустой. */
  demo?: boolean;
};

export const LEVEL_LABELS: Record<1 | 2 | 3 | 4, string> = {
  1: "Начальный",
  2: "Базовый",
  3: "Уверенный",
  4: "Продвинутый",
};

export const EMPTY_STATE: LearningState = {
  diagnostic: null,
  topics: {},
  attempts: [],
};

const MAX_ATTEMPTS = 200;

function hasWindow(): boolean {
  return typeof window !== "undefined";
}

function readJson<T>(key: string, fallback: T): T {
  if (!hasWindow()) return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as unknown;
    if (parsed === null || typeof parsed !== "object") return fallback;
    return parsed as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  if (!hasWindow()) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* приватный режим браузера — тихо игнорируем */
  }
}

export function emitLearningChange(): void {
  if (!hasWindow()) return;
  try {
    window.dispatchEvent(new CustomEvent(LEARNING_EVENT));
  } catch {
    /* ignore */
  }
}

export function subscribeLearning(listener: () => void): () => void {
  if (!hasWindow()) return () => undefined;
  const onCustom = () => listener();
  const onStorage = (event: StorageEvent) => {
    if (
      event.key === null ||
      event.key === LEARNING_PROFILE_KEY ||
      event.key === LEARNING_STATE_KEY ||
      event.key === LEARNING_CUSTOM_KEY ||
      event.key === LEARNING_ROSTER_KEY
    ) {
      listener();
    }
  };
  window.addEventListener(LEARNING_EVENT, onCustom as EventListener);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(LEARNING_EVENT, onCustom as EventListener);
    window.removeEventListener("storage", onStorage);
  };
}

/* ------------------------------- профиль ------------------------------- */

export function readLearningProfile(): LearningProfile | null {
  const value = readJson<LearningProfile | null>(LEARNING_PROFILE_KEY, null);
  if (!value || typeof value.subjectId !== "string") return null;
  return value;
}

export function writeLearningProfile(profile: Omit<LearningProfile, "updatedAt">): LearningProfile {
  const next: LearningProfile = { ...profile, updatedAt: Date.now() };
  writeJson(LEARNING_PROFILE_KEY, next);
  emitLearningChange();
  return next;
}

/* -------------------------------- прогресс ------------------------------ */

export function readLearningState(): LearningState {
  const value = readJson<Partial<LearningState>>(LEARNING_STATE_KEY, {});
  return {
    diagnostic: value.diagnostic ?? null,
    topics: value.topics && typeof value.topics === "object" ? value.topics : {},
    attempts: Array.isArray(value.attempts) ? value.attempts : [],
  };
}

function writeLearningState(state: LearningState): LearningState {
  writeJson(LEARNING_STATE_KEY, state);
  emitLearningChange();
  return state;
}

export function emptyTopicState(topicId: string): TopicState {
  return {
    topicId,
    solved: [],
    attempts: 0,
    correct: 0,
    difficulty: 1,
    streak: 0,
    lastAt: 0,
  };
}

export function saveDiagnostic(result: DiagnosticResult): LearningState {
  const state = readLearningState();
  const topics = { ...state.topics };

  // Стартовая сложность темы задаётся результатом диагностики.
  for (const [topicId, score] of Object.entries(result.byTopic)) {
    const ratio = score.total > 0 ? score.correct / score.total : 0;
    const current = topics[topicId] ?? emptyTopicState(topicId);
    topics[topicId] = {
      ...current,
      difficulty: ratio >= 0.75 ? 3 : ratio >= 0.4 ? 2 : 1,
    };
  }

  return writeLearningState({ ...state, diagnostic: result, topics });
}

/** Записывает попытку и пересчитывает адаптивный уровень темы. */
export function recordAttempt(attempt: Omit<Attempt, "at">): LearningState {
  const state = readLearningState();
  const at = Date.now();
  const current = state.topics[attempt.topicId] ?? emptyTopicState(attempt.topicId);

  const solved = attempt.correct && !current.solved.includes(attempt.taskId)
    ? [...current.solved, attempt.taskId]
    : current.solved;

  const streak = attempt.correct ? current.streak + 1 : 0;
  let difficulty: Difficulty = current.difficulty;

  // Две правильные подряд повышают уровень, ошибка на базовом — понижает.
  if (attempt.correct && streak >= 2 && difficulty < 3) {
    difficulty = (difficulty + 1) as Difficulty;
  } else if (!attempt.correct && difficulty > 1) {
    difficulty = (difficulty - 1) as Difficulty;
  }

  const topics: Record<string, TopicState> = {
    ...state.topics,
    [attempt.topicId]: {
      ...current,
      solved,
      attempts: current.attempts + 1,
      correct: current.correct + (attempt.correct ? 1 : 0),
      difficulty,
      streak: attempt.correct && streak >= 2 ? 0 : streak,
      lastAt: at,
    },
  };

  const attempts = [{ ...attempt, at }, ...state.attempts].slice(0, MAX_ATTEMPTS);
  return writeLearningState({ ...state, topics, attempts });
}

export function resetLearningProgress(): void {
  writeLearningState(EMPTY_STATE);
}

const DAY_MS = 86_400_000;

/**
 * Помечает тему как «пора повторить»: lastAt сдвигается назад,
 * чтобы баннер напоминаний в кабинете был виден сразу после диагностики.
 */
export function seedDueReview(topicId: string, daysAgo = 10): LearningState {
  const state = readLearningState();
  const current = state.topics[topicId] ?? emptyTopicState(topicId);
  const lastAt = Date.now() - daysAgo * DAY_MS;
  return writeLearningState({
    ...state,
    topics: {
      ...state.topics,
      [topicId]: {
        ...current,
        attempts: Math.max(current.attempts, 1),
        lastAt,
      },
    },
  });
}

/* --------------------------- контент учителя ---------------------------- */

type CustomContent = { topics: Topic[] };

export function readCustomTopics(): Topic[] {
  const value = readJson<CustomContent>(LEARNING_CUSTOM_KEY, { topics: [] });
  return Array.isArray(value.topics) ? value.topics : [];
}

export function saveCustomTopic(topic: Topic): Topic[] {
  const topics = readCustomTopics();
  const index = topics.findIndex((item) => item.id === topic.id);
  const next = index >= 0
    ? topics.map((item) => (item.id === topic.id ? topic : item))
    : [...topics, topic];
  writeJson(LEARNING_CUSTOM_KEY, { topics: next });
  emitLearningChange();
  return next;
}

export function deleteCustomTopic(topicId: string): Topic[] {
  const next = readCustomTopics().filter((topic) => topic.id !== topicId);
  writeJson(LEARNING_CUSTOM_KEY, { topics: next });
  emitLearningChange();
  return next;
}

/** Полный каталог: базовые темы MVP плюс темы, добавленные учителем. */
export function readAllTopics(): Topic[] {
  return [...BASE_TOPICS, ...readCustomTopics()];
}

/* ------------------------- журнал класса (учитель) ---------------------- */

export function readRoster(): Record<string, StudentLearningSnapshot> {
  return readJson<Record<string, StudentLearningSnapshot>>(LEARNING_ROSTER_KEY, {});
}

export function upsertRosterEntry(snapshot: StudentLearningSnapshot): void {
  const email = snapshot.email.trim().toLowerCase();
  if (!email) return;
  const roster = readRoster();
  roster[email] = { ...snapshot, email, updatedAt: Date.now() };
  writeJson(LEARNING_ROSTER_KEY, roster);
  emitLearningChange();
}

/**
 * Демо-класс: 6 учеников с разным уровнем. Нужен, чтобы панель учителя
 * показывала реальную статистику до того, как ученики зайдут сами.
 */
export const DEMO_ROSTER: StudentLearningSnapshot[] = [
  {
    email: "aizhan.demo@ten.kz",
    name: "Айжан Сериккызы",
    grade: 11,
    subjectId: "math",
    goals: ["ent"],
    level: 4,
    mastery: 82,
    accuracy: 88,
    solvedTasks: 12,
    weakTopics: ["math-probability"],
    updatedAt: 0,
    demo: true,
  },
  {
    email: "daniyar.demo@ten.kz",
    name: "Данияр Аманжолов",
    grade: 10,
    subjectId: "physics",
    goals: ["ent", "school"],
    level: 2,
    mastery: 41,
    accuracy: 58,
    solvedTasks: 6,
    weakTopics: ["phys-newton", "phys-current"],
    updatedAt: 0,
    demo: true,
  },
  {
    email: "madina.demo@ten.kz",
    name: "Мадина Ерболатқызы",
    grade: 9,
    subjectId: "informatics",
    goals: ["olympiad"],
    level: 3,
    mastery: 64,
    accuracy: 77,
    solvedTasks: 10,
    weakTopics: ["inf-data"],
    updatedAt: 0,
    demo: true,
  },
  {
    email: "arman.demo@ten.kz",
    name: "Арман Тлеубаев",
    grade: 9,
    subjectId: "math",
    goals: ["school", "review"],
    level: 1,
    mastery: 24,
    accuracy: 42,
    solvedTasks: 4,
    weakTopics: ["math-quadratic", "math-progression"],
    updatedAt: 0,
    demo: true,
  },
  {
    email: "aruzhan.demo@ten.kz",
    name: "Аружан Қайратқызы",
    grade: 11,
    subjectId: "biology",
    goals: ["ent"],
    level: 3,
    mastery: 70,
    accuracy: 74,
    solvedTasks: 9,
    weakTopics: ["bio-genetics"],
    updatedAt: 0,
    demo: true,
  },
  {
    email: "nurlan.demo@ten.kz",
    name: "Нұрлан Жақсылық",
    grade: 8,
    subjectId: "history-kz",
    goals: ["school"],
    level: 2,
    mastery: 38,
    accuracy: 61,
    solvedTasks: 5,
    weakTopics: ["hist-khanate"],
    updatedAt: 0,
    demo: true,
  },
];

/** Журнал класса: демо-ученики плюс реальные аккаунты этого браузера. */
export function readClassRoster(): StudentLearningSnapshot[] {
  const real = Object.values(readRoster());
  const realEmails = new Set(real.map((item) => item.email));
  const demo = DEMO_ROSTER.filter((item) => !realEmails.has(item.email));
  return [...real, ...demo].sort((a, b) => b.mastery - a.mastery);
}
