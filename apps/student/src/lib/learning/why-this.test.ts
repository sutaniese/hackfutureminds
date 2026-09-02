import { describe, expect, it } from "vitest";
import { whyThisTask, whyThisTopic } from "./why-this";
import type { Recommendation, WeakSpot } from "./recommend";
import { BASE_TOPICS } from "./catalog";

describe("why this", () => {
  const topic = BASE_TOPICS.find((item) => item.id === "math-quadratic")!;

  it("explains a skill gap on a recommended topic", () => {
    const item = {
      topic,
      score: 80,
      mastery: 20,
      priority: "high",
      reason: "Нужно закрыть пробел",
    } as Recommendation;
    const weak: WeakSpot[] = [
      { skill: topic.skills[0], topicId: topic.id, topicTitle: topic.title, accuracy: 40, attempts: 3 },
    ];
    expect(whyThisTopic(item, weak)).toMatch(/Пробел/);
  });

  it("marks constructor-published topics", () => {
    const item = {
      topic: { ...topic, custom: true },
      score: 50,
      mastery: 0,
      priority: "medium",
      reason: "Тема учителя",
    } as Recommendation;
    expect(whyThisTopic(item, [])).toMatch(/Учитель опубликовал/);
  });

  it("explains the next task from the bank", () => {
    const sentence = whyThisTask(topic.tasks[0], topic, []);
    expect(sentence).toMatch(topic.title);
  });
});
