import { describe, expect, it } from "vitest";
import { notesToTheory, parseGeneratedTasks, parseTopicNotes } from "./constructor-generate";

describe("constructor generate parse", () => {
  it("parses mixed-difficulty Groq tasks", () => {
    const tasks = parseGeneratedTasks({
      tasks: [
        {
          prompt: "2+2?",
          options: ["4", "3"],
          answerIndex: 0,
          explanation: "Сложение.",
          difficulty: 1,
          skillId: "add",
        },
        {
          prompt: "3x=9",
          options: ["3", "9", "1", "0"],
          answerIndex: 0,
          explanation: "Делим на 3.",
          difficulty: 2,
          skillId: "eq",
        },
      ],
    });
    expect(tasks).toHaveLength(2);
    expect(tasks?.[0].options).toHaveLength(4);
    expect(tasks?.[1].difficulty).toBe(2);
  });

  it("turns notes into student theory paragraphs", () => {
    const notes = parseTopicNotes({
      keyIdea: "Дискриминант показывает число корней.",
      formula: "D=b^2-4ac",
      bullets: ["D>0 два корня", "D=0 один корень", "D<0 нет действительных"],
      example: "x^2-5x+6=0, D=1, корни 2 и 3.",
      mistake: "Забыть минус перед 4ac.",
    });
    expect(notes).not.toBeNull();
    const theory = notesToTheory(notes!);
    expect(theory[0]).toContain("Дискриминант");
    expect(theory.some((line) => line.includes("Формула"))).toBe(true);
    expect(theory.at(-1)).toContain("ошибка");
  });
});
