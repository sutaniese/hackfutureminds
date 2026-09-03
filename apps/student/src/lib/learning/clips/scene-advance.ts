/** Pure clip-advance rules: a live utterance must never lose to the word-count timer. */

export type SceneAdvanceReason = "speech_end" | "speech_error" | "fallback_timer";

export function shouldArmFallbackTimer(input: {
  speechSupported: boolean;
  speechStarted: boolean;
  muted?: boolean;
}): boolean {
  if (input.speechStarted) return false;
  if (!input.speechSupported) return true;
  if (input.muted) return true;
  return true;
}

export function shouldAdvanceScene(input: {
  generation: number;
  expectedGeneration: number;
  speaking: boolean;
  paused: boolean;
  reason: SceneAdvanceReason;
}): boolean {
  if (input.generation !== input.expectedGeneration) return false;
  if (input.paused) return false;
  if (input.speaking && input.reason === "fallback_timer") return false;
  return true;
}
