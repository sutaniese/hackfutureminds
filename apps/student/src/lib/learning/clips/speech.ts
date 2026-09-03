export type SpeechPick = {
  lang: string;
  voiceName: string | null;
  usedRussianFallback: boolean;
};

function voiceList(): SpeechSynthesisVoice[] {
  if (typeof window === "undefined" || !window.speechSynthesis) return [];
  return window.speechSynthesis.getVoices();
}

export function pickSpeechVoice(language: "ru" | "kk"): SpeechPick {
  const voices = voiceList();
  const kazakh = voices.find((voice) => /^kk/i.test(voice.lang) || /kazakh|қазақ/i.test(voice.name));
  const russian = voices.find((voice) => /^ru/i.test(voice.lang) || /russian|русск/i.test(voice.name));
  if (language === "kk") {
    if (kazakh) return { lang: kazakh.lang, voiceName: kazakh.name, usedRussianFallback: false };
    return {
      lang: russian?.lang ?? "ru-RU",
      voiceName: russian?.name ?? null,
      usedRussianFallback: true,
    };
  }
  return { lang: russian?.lang ?? "ru-RU", voiceName: russian?.name ?? null, usedRussianFallback: false };
}

export function speakNarration(
  text: string,
  language: "ru" | "kk",
  onEnd: () => void,
): { cancel: () => void; pick: SpeechPick } {
  const pick = pickSpeechVoice(language);
  if (typeof window === "undefined" || !window.speechSynthesis) {
    return { cancel: () => undefined, pick };
  }
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = pick.lang;
  utterance.rate = 1;
  const match = pick.voiceName
    ? voiceList().find((voice) => voice.name === pick.voiceName)
    : null;
  if (match) utterance.voice = match;
  utterance.onend = () => onEnd();
  utterance.onerror = () => onEnd();
  window.speechSynthesis.speak(utterance);
  return {
    cancel: () => {
      utterance.onend = null;
      utterance.onerror = null;
      window.speechSynthesis.cancel();
    },
    pick,
  };
}

export function pauseSpeech() {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.pause();
}

export function resumeSpeech() {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.resume();
}

export function waitForVoices(): Promise<void> {
  if (typeof window === "undefined" || !window.speechSynthesis) return Promise.resolve();
  if (window.speechSynthesis.getVoices().length > 0) return Promise.resolve();
  return new Promise((resolve) => {
    const done = () => {
      window.speechSynthesis.removeEventListener("voiceschanged", done);
      resolve();
    };
    window.speechSynthesis.addEventListener("voiceschanged", done);
    window.setTimeout(done, 800);
  });
}
