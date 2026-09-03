import { describe, expect, it } from "vitest";
import {
  estimateDurationSec,
  fallbackLiveClipScript,
  LIVE_CLIP_MAX_SEC,
  LIVE_CLIP_MIN_SEC,
} from "@pathwise/shared";
import { parseLiveClipScript, parseLiveClipScriptFromModel } from "./live-script";

const TEACHER_TEXT =
  "Квадратное уравнение ax^2+bx+c=0. Дискриминант D=b^2-4ac. Если D>0 — два корня, D=0 — один корень, D<0 — нет действительных корней. Формула корней x=(-b±√D)/(2a).";

function validScript() {
  return {
    title: "Квадратные уравнения",
    durationSec: 48,
    language: "ru" as const,
    scenes: [
      {
        id: "s1",
        heading: "Квадратные уравнения",
        body: "ax^2+bx+c=0",
        formula: "ax^2+bx+c=0",
        narration: "Квадратное уравнение — это уравнение вида a x квадрат плюс b x плюс c равно нулю.",
        visual: "formula" as const,
      },
      {
        id: "s2",
        heading: "Дискриминант",
        formula: "D=b^2-4ac",
        narration: "Считаем дискриминант: бэ квадрат минус четыре а цэ. Знак D говорит, сколько корней.",
        visual: "formula" as const,
      },
      {
        id: "s3",
        heading: "Случаи",
        body: "D>0 два корня. D=0 один корень. D<0 нет действительных.",
        narration: "Если D больше нуля — два корня, равно нулю — один, меньше нуля — нет действительных корней.",
        visual: "compare" as const,
      },
      {
        id: "s4",
        heading: "Формула",
        formula: "x=(-b±√D)/(2a)",
        narration: "Корни считаем по формуле: минус бэ плюс-минус корень из D, всё делим на два а.",
        visual: "formula" as const,
      },
    ],
    quiz: {
      question: "Что показывает дискриминант?",
      options: ["Число действительных корней", "Сумму коэффициентов", "Свободный член"],
      correctIndex: 0,
      explanation: "Знак и равенство нулю D задают число действительных корней.",
      skillId: "discriminant",
    },
  };
}

describe("liveClipScript zod", () => {
  it("accepts a complete scene script", () => {
    const parsed = parseLiveClipScript(validScript());
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.script.scenes).toHaveLength(4);
      expect(parsed.script.quiz.options).toHaveLength(3);
    }
  });

  it("rejects a half-valid payload instead of passing it through", () => {
    const broken = {
      title: "Тема",
      durationSec: 50,
      language: "ru",
      scenes: [{ id: "s1", heading: "H", narration: "text", visual: "map" }],
      quiz: { question: "q", options: ["a", "b"], correctIndex: 0, explanation: "e", skillId: "s" },
    };
    const parsed = parseLiveClipScript(broken);
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) {
      expect(parsed.issues.length).toBeGreaterThan(0);
    }
  });

  it("rejects prose wrapped as if it were JSON", () => {
    const parsed = parseLiveClipScriptFromModel("Клип про квадратные уравнения без JSON.");
    expect(parsed.ok).toBe(false);
  });
});

describe("deterministic fallback", () => {
  it("builds a full script from the teacher's own text", () => {
    const script = fallbackLiveClipScript({
      title: "Квадратные уравнения",
      prompt: TEACHER_TEXT,
      language: "ru",
      skillId: "quadratic",
    });
    expect(script.scenes.length).toBeGreaterThanOrEqual(1);
    expect(script.scenes.length).toBeLessThanOrEqual(6);
    expect(script.quiz.options).toHaveLength(3);
    expect(script.scenes.some((scene) => scene.narration.includes("ax^2") || scene.body?.includes("Дискриминант") || scene.narration.includes("Дискриминант") || scene.body?.includes("ax^2"))).toBe(true);
    expect(parseLiveClipScript(script).ok).toBe(true);
  });

  it("keeps Kazakh language on the fallback script", () => {
    const script = fallbackLiveClipScript({
      title: "Квадрат теңдеулер",
      prompt: TEACHER_TEXT,
      language: "kk",
    });
    expect(script.language).toBe("kk");
    expect(script.quiz.question.includes("тақырыбында") || script.scenes[0]?.narration.includes("тақырыбын")).toBe(true);
  });
});

describe("40–60s duration estimate", () => {
  it("clamps the fallback and a valid model script into 40–60 seconds", () => {
    const fallback = fallbackLiveClipScript({
      title: "Квадратные уравнения",
      prompt: TEACHER_TEXT,
      language: "ru",
    });
    const estimated = estimateDurationSec(fallback);
    expect(estimated).toBeGreaterThanOrEqual(LIVE_CLIP_MIN_SEC);
    expect(estimated).toBeLessThanOrEqual(LIVE_CLIP_MAX_SEC);
    expect(fallback.durationSec).toBe(estimated);

    const parsed = parseLiveClipScript(validScript());
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.script.durationSec).toBeGreaterThanOrEqual(LIVE_CLIP_MIN_SEC);
      expect(parsed.script.durationSec).toBeLessThanOrEqual(LIVE_CLIP_MAX_SEC);
    }
  });
});
