export const VOICE_SILENCE_MS = 1200;
export const VOICE_SPEECH_DB = -40;

export function shouldStopOnSilence(input: {
  heardSpeech: boolean;
  lastLoudAt: number;
  now: number;
  silenceMs?: number;
}): boolean {
  if (!input.heardSpeech) return false;
  return input.now - input.lastLoudAt >= (input.silenceMs ?? VOICE_SILENCE_MS);
}

export function meteringToLevel(db: number): number {
  const clamped = Math.min(0, Math.max(-80, db));
  return Math.min(1, Math.max(0, (clamped + 80) / 80));
}

export function pushMeterSample(history: number[], next: number, max = 36): number[] {
  const row = history.length >= max ? history.slice(history.length - max + 1) : [...history];
  row.push(Math.min(1, Math.max(0, next)));
  return row;
}

export function waveDisplay(
  phase: "idle" | "listening" | "processing" | "speaking" | "error",
  reducedMotion: boolean,
  tab: "coach" | "control",
): "off" | "idle" | "live" | "frozen" | "static" {
  if (tab !== "coach") return "off";
  if (phase === "speaking" || phase === "error") return "off";
  if (phase === "idle") return "idle";
  if (phase === "processing") return "frozen";
  if (phase === "listening") return reducedMotion ? "static" : "live";
  return "off";
}
