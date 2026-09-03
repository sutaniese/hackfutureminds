import { describe, expect, it } from "vitest";
import {
  estimateDurationSec,
  fallbackLiveClipScript,
  LIVE_CLIP_MAX_SEC,
  LIVE_CLIP_MIN_SEC,
} from "@pathwise/shared";
import { parseLiveClipScript, parseLiveClipScriptFromModel, liveClipScriptOrFallback } from "./live-script";

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

const DERIVATIVES_BRIEF =
  "Объясни производную для 10 класса. Начни с смысла: производная — скорость измене";

function groqDerivativesPayload() {
  return {
    title: "Производная",
    durationSec: 50,
    language: "ru" as const,
    scenes: [
      {
        id: "s1",
        heading: "Скорость изменения",
        body: "Производная показывает, как быстро меняется величина.",
        narration:
          "Производная — это скорость изменения функции. Если путь зависит от времени, производная даёт мгновенную скорость.",
        visual: "diagram" as const,
      },
      {
        id: "s2",
        heading: "Предел",
        formula: "f'(x)=lim_{h->0}(f(x+h)-f(x))/h",
        narration:
          "Строго: производная в точке — предел отношения приращения функции к приращению аргумента, когда шаг стремится к нулю.",
        visual: "formula" as const,
      },
      {
        id: "s3",
        heading: "Степень и синус",
        formula: "(x^n)'=n x^{n-1}; (sin x)'=cos x",
        narration:
          "Таблица: производная x в степени n равна n x в степени n минус один. Производная синуса — косинус.",
        visual: "formula" as const,
      },
      {
        id: "s4",
        heading: "Пример",
        formula: "f(x)=x^3-3x",
        narration:
          "Разберём f от x равно x куб минус три x. Производная: три x квадрат минус три. В точке один это ноль.",
        visual: "bullets" as const,
      },
      {
        id: "s5",
        heading: "Вывод",
        narration:
          "Запомните: производная — скорость изменения, через предел. Считайте степень и синус по таблице, затем подставьте точку.",
        visual: "bullets" as const,
      },
    ],
    quiz: {
      question: "Чему равна производная f(x)=x^3-3x?",
      options: ["3x^2-3", "x^2-3", "3x^3-3"],
      correctIndex: 0,
      explanation: "Степень: (x^3)'=3x^2, константа даёт -3.",
      skillId: "derivative",
    },
  };
}

describe("Groq JSON is the happy path", () => {
  it("accepts a Groq-shaped derivatives payload without echoing the brief as a heading", () => {
    const parsed = parseLiveClipScriptFromModel(JSON.stringify(groqDerivativesPayload()), {
      language: "ru",
      skillId: "derivative",
      brief: DERIVATIVES_BRIEF,
    });
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const headings = parsed.script.scenes.map((scene) => scene.heading.toLowerCase());
    expect(headings.some((heading) => heading.includes("объясни производную"))).toBe(false);
    expect(parsed.script.quiz.question.includes("Объясни производную")).toBe(false);
    expect(parsed.script.scenes.some((scene) => /скорост/i.test(scene.heading + scene.narration))).toBe(true);
    expect(parsed.script.scenes.some((scene) => /предел|lim/i.test(scene.heading + (scene.formula ?? "") + scene.narration))).toBe(true);
    expect(parsed.script.scenes.some((scene) => /sin|синус/i.test(`${scene.formula ?? ""} ${scene.narration}`))).toBe(true);
    expect(parsed.script.scenes.some((scene) => /x\^3|x³/.test(`${scene.formula ?? ""} ${scene.narration}`))).toBe(true);
  });

  it("does not return the deterministic template when Groq JSON is valid", () => {
    const result = liveClipScriptOrFallback(JSON.stringify(groqDerivativesPayload()), {
      title: DERIVATIVES_BRIEF,
      prompt: DERIVATIVES_BRIEF,
      language: "ru",
      skillId: "derivative",
    });
    expect(result.source).toBe("ai");
    expect(result.script.quiz.options).not.toContain("Другое правило из соседней темы");
    expect(result.script.quiz.options).not.toContain("Случайный факт без связи с условием");
    const fallback = fallbackLiveClipScript({
      title: DERIVATIVES_BRIEF,
      prompt: DERIVATIVES_BRIEF,
      language: "ru",
    });
    expect(fallback.quiz.options).toContain("Другое правило из соседней темы");
    expect(result.script.quiz.question).not.toBe(fallback.quiz.question);
  });

  it("coerces string correctIndex and extra prose wrapping", () => {
    const wrapped = `Вот клип:\n${JSON.stringify({
      ...groqDerivativesPayload(),
      quiz: { ...groqDerivativesPayload().quiz, correctIndex: "0" },
    })}`;
    const parsed = parseLiveClipScriptFromModel(wrapped, { language: "ru", brief: DERIVATIVES_BRIEF });
    expect(parsed.ok).toBe(true);
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
