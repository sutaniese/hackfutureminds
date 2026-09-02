import { describe, expect, it } from "vitest";
import { snapshotFromProgress, nextReviewMap } from "./snapshot";
import { EMPTY_STATE } from "./empty-state";
import type { LearningState } from "./store";
import { BASE_TOPICS } from "./catalog";

describe("progress snapshot for the teacher board", () => {
  it("returns a real student row even before diagnostics (no demo badge)", () => {
    const row = snapshotFromProgress({
      email: "student@school.kz",
      name: "Айжан",
      profile: null,
      state: EMPTY_STATE,
      topics: BASE_TOPICS,
    });
    expect(row?.email).toBe("student@school.kz");
    expect(row?.name).toBe("Айжан");
    expect(row?.demo).toBeUndefined();
    expect(row?.mastery).toBe(0);
  });

  it("writes accuracy from recorded attempts", () => {
    const topic = BASE_TOPICS.find((item) => item.id === "math-quadratic")!;
    const state: LearningState = {
      diagnostic: null,
      topics: {
        "math-quadratic": {
          topicId: "math-quadratic",
          solved: [topic.tasks[0].id],
          attempts: 2,
          correct: 1,
          difficulty: 1,
          streak: 0,
          lastAt: 1_700_000_000_000,
        },
      },
      attempts: [
        {
          taskId: topic.tasks[0].id,
          topicId: "math-quadratic",
          skill: topic.tasks[0].skill,
          difficulty: 1,
          correct: true,
          answer: "1",
          at: 1_700_000_000_000,
        },
        {
          taskId: topic.tasks[1].id,
          topicId: "math-quadratic",
          skill: topic.tasks[1].skill,
          difficulty: 1,
          correct: false,
          answer: "0",
          at: 1_700_000_000_100,
        },
      ],
    };
    const row = snapshotFromProgress({
      email: "student@school.kz",
      profile: {
        grade: 9,
        subjectId: "math",
        goals: ["school"],
        minutesPerDay: 30,
        updatedAt: 1,
      },
      state,
      topics: BASE_TOPICS,
    });
    expect(row?.accuracy).toBeGreaterThan(0);
    expect(row?.solvedTasks).toBeGreaterThan(0);
  });

  it("computes next_review timestamps from last activity", () => {
    const lastAt = Date.UTC(2026, 8, 1);
    const state: LearningState = {
      diagnostic: null,
      topics: {
        "math-quadratic": {
          topicId: "math-quadratic",
          solved: [],
          attempts: 1,
          correct: 0,
          difficulty: 1,
          streak: 0,
          lastAt,
        },
      },
      attempts: [],
    };
    const map = nextReviewMap(BASE_TOPICS, state);
    expect(map["math-quadratic"]).toBeGreaterThan(lastAt);
  });
});
