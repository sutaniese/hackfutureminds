import { describe, expect, it, vi } from "vitest";
import { shouldAdvanceScene, shouldArmFallbackTimer } from "./scene-advance";

describe("scene advance vs speech", () => {
  it("does not call nextScene from the timer while speaking is true", () => {
    const nextScene = vi.fn();
    const speaking = true;
    if (shouldAdvanceScene({
      generation: 3,
      expectedGeneration: 3,
      speaking,
      paused: false,
      reason: "fallback_timer",
    })) {
      nextScene();
    }
    expect(nextScene).not.toHaveBeenCalled();
  });

  it("advances only on speech_end while an utterance is live", () => {
    expect(
      shouldAdvanceScene({
        generation: 1,
        expectedGeneration: 1,
        speaking: true,
        paused: false,
        reason: "speech_end",
      }),
    ).toBe(true);
  });

  it("ignores a stale onend from a cancelled utterance", () => {
    expect(
      shouldAdvanceScene({
        generation: 4,
        expectedGeneration: 3,
        speaking: false,
        paused: false,
        reason: "speech_end",
      }),
    ).toBe(false);
  });

  it("does not arm the word-count timer once speech has started", () => {
    expect(shouldArmFallbackTimer({ speechSupported: true, speechStarted: true })).toBe(false);
  });

  it("arms the timer only when speech cannot run", () => {
    expect(shouldArmFallbackTimer({ speechSupported: false, speechStarted: false })).toBe(true);
    expect(shouldArmFallbackTimer({ speechSupported: true, speechStarted: false, muted: true })).toBe(true);
  });

  it("holds the scene while paused", () => {
    expect(
      shouldAdvanceScene({
        generation: 1,
        expectedGeneration: 1,
        speaking: false,
        paused: true,
        reason: "speech_end",
      }),
    ).toBe(false);
  });
});
