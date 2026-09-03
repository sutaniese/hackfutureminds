import type { LiveClipScript } from "@pathwise/shared";

/**
 * Учебное ядро платформы: предметы → темы → задания.
 *
 * Данные каталога статичны (mock-данные MVP), прогресс ученика хранится
 * в localStorage (`store.ts`), персонализация считается в `recommend.ts`.
 */

/** Классы школы Казахстана, которые покрывает MVP. */
export type Grade = 7 | 8 | 9 | 10 | 11 | 12;

/** 1 — базовый уровень, 2 — средний, 3 — продвинутый. */
export type Difficulty = 1 | 2 | 3;

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  1: "Базовый",
  2: "Средний",
  3: "Продвинутый",
};

/** Цель обучения — влияет на подбор тем и темп плана. */
export type LearningGoalId = "ent" | "olympiad" | "review" | "school" | "abroad";

export type LearningGoal = {
  id: LearningGoalId;
  title: string;
  hint: string;
};

export const LEARNING_GOALS: readonly LearningGoal[] = [
  { id: "ent", title: "Подготовка к ЕНТ", hint: "Плотный график, упор на типовые задания" },
  { id: "olympiad", title: "Олимпиада", hint: "Больше заданий продвинутого уровня" },
  { id: "review", title: "Повторить тему", hint: "Точечно закрыть пробелы" },
  { id: "school", title: "Подтянуть школьную программу", hint: "Ровный темп по всем темам" },
  { id: "abroad", title: "Поступление за рубеж", hint: "Акцент на английский и профильные предметы" },
] as const;

export type TaskType = "single" | "numeric" | "text";

export type Task = {
  id: string;
  topicId: string;
  type: TaskType;
  difficulty: Difficulty;
  /** Микро-навык внутри темы — по нему считаются слабые места. */
  skill: string;
  prompt: string;
  /** Дополнительный текст (условие, отрывок) над вопросом. */
  passage?: string;
  /** Только для type === "single". */
  options?: string[];
  /** Индекс правильного варианта (single) либо эталонный ответ (numeric/text). */
  answer: number | string;
  /** Синонимы правильного ответа для type === "text". */
  accepted?: string[];
  explanation: string;
  minutes: number;
};

export type MaterialKind = "theory" | "practice" | "video" | "checklist";

export const MATERIAL_KIND_LABELS: Record<MaterialKind, string> = {
  theory: "Конспект",
  practice: "Практика",
  video: "Разбор",
  checklist: "Чек-лист",
};

export type Material = {
  title: string;
  kind: MaterialKind;
  minutes: number;
  summary: string;
};

export type Topic = {
  id: string;
  subjectId: string;
  title: string;
  grades: Grade[];
  summary: string;
  skills: string[];
  /** Короткий конспект темы — абзацы. */
  theory: string[];
  notes?: {
    keyIdea: string;
    formula?: string;
    bullets: string[];
    example: string;
    mistake: string;
  } | null;
  materials: Material[];
  tasks: Task[];
  /** Тема добавлена учителем через конструктор. */
  custom?: boolean;
  /** Автор темы (учитель) — для панели учителя. */
  author?: string;
  /** Живой клип (JSON-сцены), без видеофайла. */
  clipScript?: LiveClipScript | null;
};

export type Subject = {
  id: string;
  title: string;
  mark: string;
  description: string;
  accent: string;
};

export function taskCorrectLabel(task: Task): string {
  if (task.type === "single" && task.options) {
    const index = typeof task.answer === "number" ? task.answer : Number(task.answer);
    return task.options[index] ?? String(task.answer);
  }
  return String(task.answer);
}

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[.,;:!?'"«»]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function toNumber(value: string): number | null {
  const cleaned = value.replace(/\s/g, "").replace(",", ".");
  if (!cleaned) return null;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

/** Проверка ответа ученика с учётом типа задания. */
export function isAnswerCorrect(task: Task, given: string | number | null): boolean {
  if (given === null || given === "") return false;

  if (task.type === "single") {
    const expected = typeof task.answer === "number" ? task.answer : Number(task.answer);
    return Number(given) === expected;
  }

  if (task.type === "numeric") {
    const expected = toNumber(String(task.answer));
    const actual = toNumber(String(given));
    if (expected === null || actual === null) return false;
    return Math.abs(expected - actual) < 1e-6;
  }

  const expectedList = [String(task.answer), ...(task.accepted ?? [])].map(normalizeText);
  return expectedList.includes(normalizeText(String(given)));
}
