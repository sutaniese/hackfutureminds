import { learningSummary, weakSpots, reviewIntervalDays, topicMastery } from "./recommend";
import type { LearningProfile, LearningState, StudentLearningSnapshot, TopicState } from "./store";
import type { Topic } from "./types";

export function computeNextReviewAt(topic: Topic, state: LearningState, lastAt: number): number {
  const mastery = topicMastery(topic, state);
  const days = reviewIntervalDays(mastery);
  return lastAt + days * 86_400_000;
}

export function nextReviewMap(
  topics: readonly Topic[],
  state: LearningState,
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const topic of topics) {
    const topicState: TopicState | undefined = state.topics[topic.id];
    if (!topicState?.lastAt) continue;
    out[topic.id] = computeNextReviewAt(topic, state, topicState.lastAt);
  }
  return out;
}

/** Compact row the teacher board shows for one real student. */
export function snapshotFromProgress(input: {
  email: string;
  name?: string;
  profile: LearningProfile | null;
  state: LearningState;
  topics: readonly Topic[];
}): StudentLearningSnapshot | null {
  const { email, name, profile, state, topics } = input;
  if (!profile) {
    return {
      email: email.trim().toLowerCase(),
      name,
      grade: 9,
      subjectId: "math",
      goals: ["school"],
      level: 1,
      mastery: 0,
      accuracy: 0,
      solvedTasks: 0,
      weakTopics: [],
      updatedAt: Date.now(),
    };
  }
  const summary = learningSummary(topics, profile, state);
  const weak = weakSpots(topics, state, 6);
  return {
    email: email.trim().toLowerCase(),
    name,
    grade: profile.grade,
    subjectId: profile.subjectId,
    goals: profile.goals,
    level: state.diagnostic?.level ?? 1,
    mastery: summary.mastery,
    accuracy: summary.accuracy ?? 0,
    solvedTasks: summary.solvedTasks,
    weakTopics: [...new Set(weak.map((item) => item.topicId).filter(Boolean))],
    updatedAt: Date.now(),
  };
}
