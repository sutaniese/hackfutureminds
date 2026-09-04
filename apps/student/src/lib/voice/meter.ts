export type VoiceWaveMode = "off" | "idle" | "live" | "frozen" | "static";

export const VOICE_SILENCE_MS = 1200;
/** Time-domain RMS (0–1) above which we treat the mic as hearing speech. */
export const VOICE_SPEECH_RMS = 0.04;
/** expo-av metering (dB, typically −160…0) treated as speech. */
export const VOICE_SPEECH_DB = -40;

export function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function waveDisplay(
  phase: "idle" | "listening" | "processing" | "speaking" | "error",
  reducedMotion: boolean,
  tab: "coach" | "control",
): VoiceWaveMode {
  if (tab !== "coach") return "off";
  if (phase === "speaking" || phase === "error") return "off";
  if (phase === "idle") return "idle";
  if (phase === "processing") return "frozen";
  if (phase === "listening") return reducedMotion ? "static" : "live";
  return "off";
}

export function rmsFromTimeDomain(data: Uint8Array | ArrayLike<number>): number {
  if (data.length === 0) return 0;
  let sum = 0;
  for (let i = 0; i < data.length; i++) {
    const centered = (data[i] - 128) / 128;
    sum += centered * centered;
  }
  return Math.sqrt(sum / data.length);
}

export function shouldStopOnSilence(input: {
  heardSpeech: boolean;
  lastLoudAt: number;
  now: number;
  silenceMs?: number;
}): boolean {
  if (!input.heardSpeech) return false;
  return input.now - input.lastLoudAt >= (input.silenceMs ?? VOICE_SILENCE_MS);
}

export function timeDomainToPoints(data: ArrayLike<number>, count = 64): number[] {
  if (data.length === 0) return Array.from({ length: count }, () => 0.5);
  const out: number[] = [];
  const step = data.length / count;
  for (let i = 0; i < count; i++) {
    const idx = Math.min(data.length - 1, Math.floor(i * step));
    out.push(data[idx] / 255);
  }
  return out;
}

export function idleWavePoints(count = 64): number[] {
  return Array.from({ length: count }, () => 0.5);
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
