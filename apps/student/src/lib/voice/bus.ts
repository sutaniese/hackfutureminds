export const VOICE_CONTROL_EVENT = "ten:voice-control";
export const VOICE_CONTROL_TOGGLE = "ten:voice-control-toggle";
export const LS_VOICE_CONTROL = "ten-voice-control";

export type VoiceUiEvent =
  | { type: "diagnostic"; verb: "start" | "skip" | "dont_know"; subjectId?: string }
  | { type: "clip"; verb: "play" | "pause" | "replay" | "open"; topicQuery?: string }
  | { type: "join_class"; inviteCode: string }
  | { type: "open_more" };

export function emitVoiceUi(detail: VoiceUiEvent) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(VOICE_CONTROL_EVENT, { detail }));
}

export function screenDigest(): string {
  if (typeof document === "undefined") return "";
  const main = document.querySelector("main") ?? document.body;
  return (main.innerText || "").replace(/\s+/g, " ").trim().slice(0, 900);
}
