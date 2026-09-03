import { describe, expect, it } from "vitest";
import { canStartListening, isStaleVoiceToken, phaseAfterInterrupt } from "./machine";

describe("voice session tokens", () => {
  it("drops a transcript from a cancelled listen", () => {
    expect(isStaleVoiceToken(2, 3)).toBe(true);
    expect(isStaleVoiceToken(4, 4)).toBe(false);
  });

  it("does not listen while TTS is speaking", () => {
    expect(canStartListening("speaking")).toBe(false);
    expect(canStartListening("idle")).toBe(true);
  });

  it("interrupt returns to idle instead of listening", () => {
    expect(phaseAfterInterrupt()).toBe("idle");
    expect(canStartListening(phaseAfterInterrupt())).toBe(true);
  });
});
