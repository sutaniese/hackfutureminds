export const PROGRESS_STORAGE_KEY = "pathwise_progress";

export type Level = 1 | 2 | 3 | 4;

export type BadgeId =
  | "first_step"
  | "career_found"
  | "grant_hunter"
  | "fully_funded"
  | "packaged"
  | "all_done";

export type UserProgress = {
  xp: number;
  level: Level;
  badges: BadgeId[];
  streak: number;
  profileCompletion: number;
  lastSeenDate?: string;
  completedEvents: string[];
};

export type BadgeInfo = {
  id: BadgeId;
  icon: string;
  name: string;
  description: string;
};

export const BADGES: Record<BadgeId, BadgeInfo> = {
  first_step: {
    id: "first_step",
    icon: "✦",
    name: "Первый шаг",
    description: "Первый вопрос онбординга завершён.",
  },
  career_found: {
    id: "career_found",
    icon: "◈",
    name: "Направление найдено",
    description: "Карьерная карта готова.",
  },
  grant_hunter: {
    id: "grant_hunter",
    icon: "◆",
    name: "Грантовый охотник",
    description: "Найден первый подходящий грант.",
  },
  fully_funded: {
    id: "fully_funded",
    icon: "●",
    name: "Полное покрытие",
    description: "Гранты покрывают 90%+ расходов.",
  },
  packaged: {
    id: "packaged",
    icon: "▣",
    name: "Упакован",
    description: "Портфолио-блок сгенерирован.",
  },
  all_done: {
    id: "all_done",
    icon: "★",
    name: "Готов к мечте",
    description: "Все три артефакта завершены.",
  },
};

export const LEVEL_NAMES: Record<Level, string> = {
  1: "Новичок",
  2: "Искатель",
  3: "Стратег",
  4: "Визионер",
};

export const DEFAULT_PROGRESS: UserProgress = {
  xp: 0,
  level: 1,
  badges: [],
  streak: 0,
  profileCompletion: 0,
  completedEvents: [],
};

export function levelFromXp(xp: number): Level {
  if (xp >= 500) return 4;
  if (xp >= 250) return 3;
  if (xp >= 100) return 2;
  return 1;
}

export function levelBounds(level: Level): { min: number; next: number | null } {
  if (level === 1) return { min: 0, next: 100 };
  if (level === 2) return { min: 100, next: 250 };
  if (level === 3) return { min: 250, next: 500 };
  return { min: 500, next: null };
}

export function progressToNextLevel(progress: UserProgress): number {
  const { min, next } = levelBounds(progress.level);
  if (next == null) return 100;
  return Math.min(100, Math.max(0, ((progress.xp - min) / (next - min)) * 100));
}

export function todayKey(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

function daysBetween(a: string, b: string): number {
  const start = new Date(`${a}T00:00:00.000Z`).getTime();
  const end = new Date(`${b}T00:00:00.000Z`).getTime();
  return Math.round((end - start) / 86_400_000);
}

export function applyDailyStreak(progress: UserProgress, today = todayKey()): UserProgress {
  if (progress.lastSeenDate === today) return progress;
  const gap = progress.lastSeenDate ? daysBetween(progress.lastSeenDate, today) : null;
  return {
    ...progress,
    streak: gap === 1 ? progress.streak + 1 : 1,
    lastSeenDate: today,
  };
}

export function normalizeProgress(value: unknown): UserProgress {
  if (!value || typeof value !== "object") return DEFAULT_PROGRESS;
  const raw = value as Partial<UserProgress>;
  const xp = Number.isFinite(raw.xp) ? Math.max(0, Number(raw.xp)) : 0;
  const badges = Array.isArray(raw.badges)
    ? raw.badges.filter((id): id is BadgeId => typeof id === "string" && id in BADGES)
    : [];
  const profileCompletion = Number.isFinite(raw.profileCompletion)
    ? Math.min(100, Math.max(0, Number(raw.profileCompletion)))
    : 0;
  const completedEvents = Array.isArray(raw.completedEvents)
    ? raw.completedEvents.filter((event): event is string => typeof event === "string")
    : [];

  return {
    xp,
    level: levelFromXp(xp),
    badges,
    streak: Number.isFinite(raw.streak) ? Math.max(0, Number(raw.streak)) : 0,
    profileCompletion,
    lastSeenDate: typeof raw.lastSeenDate === "string" ? raw.lastSeenDate : undefined,
    completedEvents,
  };
}
