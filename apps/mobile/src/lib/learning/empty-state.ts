import type { Difficulty } from "./types";

/**
 * Shared empty learning state. Kept out of `store.ts` so server modules
 * (class board, progress APIs) do not import the client auth/localStorage layer.
 */
export const EMPTY_STATE = {
  diagnostic: null,
  topics: {} as Record<
    string,
    {
      topicId: string;
      solved: string[];
      attempts: number;
      correct: number;
      difficulty: Difficulty;
      streak: number;
      lastAt: number;
      nextReviewAt?: number;
    }
  >,
  attempts: [] as Array<{
    taskId: string;
    topicId: string;
    skill: string;
    difficulty: Difficulty;
    correct: boolean;
    answer: string;
    at: number;
  }>,
};

export function emptyTopicState(topicId: string) {
  return {
    topicId,
    solved: [] as string[],
    attempts: 0,
    correct: 0,
    difficulty: 1 as Difficulty,
    streak: 0,
    lastAt: 0,
    nextReviewAt: undefined as number | undefined,
  };
}
