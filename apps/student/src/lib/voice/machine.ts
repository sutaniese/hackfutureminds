export type VoicePhase = "idle" | "listening" | "processing" | "speaking" | "error";
export type VoiceTab = "coach" | "control";

export function isStaleVoiceToken(token: number, current: number): boolean {
  return token !== current;
}

export function canStartListening(phase: VoicePhase): boolean {
  return phase !== "speaking" && phase !== "processing";
}

export function nextToken(current: number): number {
  return current + 1;
}
