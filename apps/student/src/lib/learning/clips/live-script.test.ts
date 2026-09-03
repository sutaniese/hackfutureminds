import { describe, expect, it } from "vitest";
import {
  LIVE_CLIP_MAX_SCENES,
  estimateDurationSec,
  fallbackLiveClip,
  topicHasWatchableClip,
  totalNarrationWords,
} from "@pathwise/shared";
import { coerceLiveClipScript, liveClipFromModelText, liveClipScriptSchema } from "./live-script";

const FALLBACK = {
  title: "Квадратные уравнения",
  prompt: "Объясни дискриминант и формулу корней. Покажи D = b^2 - 4ac и когда два корня.",
  language: "ru" as const,
  skillId: "Дискриминант",
};

describe("live clip script", () => {
  it("validates a complete script with zod", () => {
    const script = fallbackLiveClip(FALLBACK);
    const parsed = liveClipScriptSchema.safeParse(script);
    expect(parsed.success).toBe(true);
    expect(script.scenes.length).toBeLessThanOrEqual(LIVE_CLIP_MAX_SCENES);
    expect(script.quiz.options).toHaveLength(3);
  });

  it("falls back to a complete template from teacher text", () => {
    const { script, source } = coerceLiveClipScript({ title: "only title" }, FALLBACK);
    expect(source).toBe("fallback");
    expect(liveClipScriptSchema.safeParse(script).success).toBe(true);
    expect(script.scenes.length).toBeGreaterThanOrEqual(4);
    expect(script.quiz.options[0].length).toBeGreaterThan(0);
    expect(script.title).toBe(FALLBACK.title);
  });

  it("never returns half-valid JSON from broken model text", () => {
    const { script } = liveClipFromModelText("конечно: {\"scenes\":[{}]} хвост", FALLBACK);
    expect(script.scenes.every((scene) => scene.narration && scene.heading && scene.visual)).toBe(true);
    expect(script.quiz.options).toHaveLength(3);
    expect(typeof script.quiz.correctIndex).toBe("number");
  });

  it("normalizes a near-valid payload instead of dropping it", () => {
    const { script, source } = coerceLiveClipScript(
      {
        title: "Дискриминант",
        language: "ru",
        durationSec: 52,
        scenes: [
          { id: "a", heading: "Зачем", narration: "Дискриминант говорит, сколько корней.", visual: "diagram" },
          { id: "b", heading: "Формула", narration: "D равно b в квадрате минус четыре a c.", visual: "formula", formula: "D = b^2 - 4ac" },
          { id: "c", heading: "Смысл", narration: "Если D больше нуля — два корня.", visual: "bullets", body: "D>0 два\nD=0 один" },
          { id: "d", heading: "Проверка", narration: "Подставь коэффициенты и сравни знак D.", visual: "compare" },
        ],
        quiz: {
          question: "Когда два корня?",
          options: ["D>0", "D<0", "a=0"],
          correctIndex: 0,
          explanation: "Положительный дискриминант.",
          skillId: "Дискриминант",
        },
      },
      FALLBACK,
    );
    expect(source === "schema" || source === "normalized").toBe(true);
    expect(script.scenes).toHaveLength(4);
    expect(script.quiz.correctIndex).toBe(0);
  });

  it("estimates 40–60s from word count at ~2.5 words/sec", () => {
    expect(estimateDurationSec(100)).toBe(40);
    expect(estimateDurationSec(125)).toBe(50);
    expect(estimateDurationSec(140)).toBe(56);
    expect(estimateDurationSec(200)).toBe(70);
    const script = fallbackLiveClip(FALLBACK);
    expect(script.durationSec).toBeGreaterThanOrEqual(40);
    expect(script.durationSec).toBeLessThanOrEqual(70);
    expect(totalNarrationWords(script.scenes)).toBeLessThanOrEqual(160);
  });

  it("marks a custom topic with liveClip as watchable", () => {
    const script = fallbackLiveClip(FALLBACK);
    expect(topicHasWatchableClip({ id: "custom-demo", liveClip: script }, "ru")).toBe(true);
    expect(topicHasWatchableClip({ id: "custom-demo" }, "ru")).toBe(false);
  });
});
