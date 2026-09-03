import { getCurrentUser } from "../auth";
import { isDemoRosterEnabled, isSupabaseConfigured } from "../env";
import { apiPut } from "../api";
import { emitStorageChange, readJson, subscribeStorage, writeJson } from "../storage";
import { BASE_TOPICS } from "./catalog";
import { EMPTY_STATE, emptyTopicState } from "./empty-state";
import type { Difficulty, Grade, LearningGoalId, Topic } from "./types";

export const LEARNING_PROFILE_KEY = "ten-learning-profile";
export const LEARNING_STATE_KEY = "ten-learning-state";
export const LEARNING_CUSTOM_KEY = "ten-learning-custom-content";
export const LEARNING_REMOTE_CUSTOM_KEY = "ten-learning-remote-custom";
export const LEARNING_ROSTER_KEY = "ten-learning-roster";

export type LearningProfile = {
  grade: Grade;
  subjectId: string;
  goals: LearningGoalId[];
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
  level: 1 | 2 | 3 | 4;
  byTopic: Record<string, ScorePair>;
  bySkill: Record<string, ScorePair>;
  at: number;
};

export type TopicState = {
  topicId: string;
  solved: string[];
  attempts: number;
  correct: number;
  difficulty: Difficulty;
  streak: number;
  lastAt: number;
  nextReviewAt?: number;
};

export type LearningState = {
  diagnostic: DiagnosticResult | null;
  topics: Record<string, TopicState>;
  attempts: Attempt[];
};

export type StudentLearningSnapshot = {
  email: string;
  name?: string;
  grade: Grade;
  subjectId: string;
  goals: LearningGoalId[];
  level: 1 | 2 | 3 | 4;
  mastery: number;
  accuracy: number;
  solvedTasks: number;
  weakTopics: string[];
  updatedAt: number;
  demo?: boolean;
  lastActivityAt?: number;
  nextReviews?: Record<string, number>;
  missedTasks?: Array<{ topicId: string; taskId: string; skill: string; prompt: string }>;
  clipStats?: { watched: number; dropped: number; stuck: number };
};

export const LEVEL_LABELS: Record<1 | 2 | 3 | 4, string> = {
  1: "Начальный",
  2: "Базовый",
  3: "Уверенный",
  4: "Продвинутый",
};

const MAX_ATTEMPTS = 200;
const DAY_MS = 86_400_000;

function accountScope(): string {
  const email = getCurrentUser()?.email?.trim().toLowerCase();
  return email || "guest";
}

function scopedKey(base: string): string {
  return `${base}::${accountScope()}`;
}

function adoptLegacyKey(base: string): string {
  const scoped = scopedKey(base);
  if (!readJson(scoped, null) ) {
    const legacy = readJson(base, null);
    if (legacy) writeJson(scoped, legacy);
  }
  return scoped;
}

export function emitLearningChange(): void {
  emitStorageChange();
}

export function subscribeLearning(listener: () => void): () => void {
  return subscribeStorage(listener);
}

export function readLearningProfile(): LearningProfile | null {
  const value = readJson<LearningProfile | null>(adoptLegacyKey(LEARNING_PROFILE_KEY), null);
  if (!value || typeof value.subjectId !== "string") return null;
  return value;
}

export function writeLearningProfile(profile: Omit<LearningProfile, "updatedAt">): LearningProfile {
  const next: LearningProfile = { ...profile, updatedAt: Date.now() };
  writeJson(scopedKey(LEARNING_PROFILE_KEY), next);
  scheduleRemoteSync();
  return next;
}

export function readLearningState(): LearningState {
  const value = readJson<Partial<LearningState>>(adoptLegacyKey(LEARNING_STATE_KEY), {});
  return {
    diagnostic: value.diagnostic ?? null,
    topics: value.topics && typeof value.topics === "object" ? value.topics : {},
    attempts: Array.isArray(value.attempts) ? value.attempts : [],
  };
}

function writeLearningState(state: LearningState): LearningState {
  writeJson(scopedKey(LEARNING_STATE_KEY), state);
  scheduleRemoteSync();
  return state;
}

let remoteCustomTopics: Topic[] = [];

function asTeacherTopic(topic: Topic): Topic {
  return { ...topic, custom: true };
}

function readPersistedRemoteTopics(): Topic[] {
  const value = readJson<Topic[]>(adoptLegacyKey(LEARNING_REMOTE_CUSTOM_KEY), []);
  return Array.isArray(value) ? value.map(asTeacherTopic) : [];
}

export function applyRemoteCustomTopics(topics: Topic[]): void {
  remoteCustomTopics = Array.isArray(topics) ? topics.map(asTeacherTopic) : [];
  writeJson(scopedKey(LEARNING_REMOTE_CUSTOM_KEY), remoteCustomTopics);
  emitLearningChange();
}

export function applyRemoteLearning(input: {
  profile?: LearningProfile | null;
  state?: LearningState | null;
  topics?: Topic[];
}): void {
  if (input.profile) writeJson(scopedKey(LEARNING_PROFILE_KEY), input.profile);
  if (input.state) writeJson(scopedKey(LEARNING_STATE_KEY), input.state);
  if (input.topics) {
    remoteCustomTopics = input.topics.map(asTeacherTopic);
    writeJson(scopedKey(LEARNING_REMOTE_CUSTOM_KEY), remoteCustomTopics);
  }
  emitLearningChange();
}

let syncTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleRemoteSync(): void {
  if (!isSupabaseConfigured() || !getCurrentUser()) return;
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(() => {
    const profile = readLearningProfile();
    const state = readLearningState();
    void apiPut("/api/learning/progress", { profile, state }).catch(() => undefined);
  }, 450);
}

export function saveDiagnostic(result: DiagnosticResult): LearningState {
  const state = readLearningState();
  const topics = { ...state.topics };
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

export function recordAttempt(attempt: Omit<Attempt, "at">): LearningState {
  const state = readLearningState();
  const at = Date.now();
  const current = state.topics[attempt.topicId] ?? emptyTopicState(attempt.topicId);
  const solved =
    attempt.correct && !current.solved.includes(attempt.taskId)
      ? [...current.solved, attempt.taskId]
      : current.solved;
  const streak = attempt.correct ? current.streak + 1 : 0;
  let difficulty: Difficulty = current.difficulty;
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
      nextReviewAt: at + (attempt.correct ? 5 : 3) * DAY_MS,
    },
  };
  const attempts = [{ ...attempt, at }, ...state.attempts].slice(0, MAX_ATTEMPTS);
  return writeLearningState({ ...state, topics, attempts });
}

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
        nextReviewAt: Date.now() - DAY_MS,
      },
    },
  });
}

type CustomContent = { topics: Topic[] };

export function readCustomTopics(): Topic[] {
  const value = readJson<CustomContent>(LEARNING_CUSTOM_KEY, { topics: [] });
  return Array.isArray(value.topics) ? value.topics : [];
}

export function saveCustomTopic(topic: Topic): Topic[] {
  const topics = readCustomTopics();
  const index = topics.findIndex((item) => item.id === topic.id);
  const next = index >= 0 ? topics.map((item) => (item.id === topic.id ? topic : item)) : [...topics, topic];
  writeJson(LEARNING_CUSTOM_KEY, { topics: next });
  return next;
}

export function readAllTopics(): Topic[] {
  if (remoteCustomTopics.length === 0) {
    remoteCustomTopics = readPersistedRemoteTopics();
  }
  const byId = new Map<string, Topic>();
  // Teacher-published constructor topics last so they win over baked catalog ids.
  for (const topic of [...BASE_TOPICS, ...readCustomTopics(), ...remoteCustomTopics]) {
    byId.set(topic.id, topic);
  }
  return [...byId.values()];
}

export function readRoster(): Record<string, StudentLearningSnapshot> {
  return readJson<Record<string, StudentLearningSnapshot>>(LEARNING_ROSTER_KEY, {});
}

export function upsertRosterEntry(snapshot: StudentLearningSnapshot): void {
  const email = snapshot.email.trim().toLowerCase();
  if (!email) return;
  const roster = readRoster();
  roster[email] = { ...snapshot, email, updatedAt: Date.now() };
  writeJson(LEARNING_ROSTER_KEY, roster);
}

export const DEMO_ROSTER: StudentLearningSnapshot[] = [];

export function readClassRoster(): StudentLearningSnapshot[] {
  const real = Object.values(readRoster()).filter((item) => !item.demo);
  if (!isDemoRosterEnabled()) {
    return real.sort((a, b) => b.mastery - a.mastery);
  }
  return real.sort((a, b) => b.mastery - a.mastery);
}

export { EMPTY_STATE, emptyTopicState };
