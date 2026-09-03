/**
 * Синтез речи через Web Speech API — озвучка конспектов и заданий
 * для учеников с особыми образовательными потребностями.
 * Общий помощник для голосового ассистента и учебного модуля.
 */

export function speechLanguage(locale: string): string {
  if (locale === "en") return "en-US";
  if (locale === "kk") return "kk-KZ";
  return "ru-RU";
}

export function isSpeechSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function pickSpeechVoice(language: string): SpeechSynthesisVoice | null {
  if (!isSpeechSupported()) return null;
  const voices = window.speechSynthesis.getVoices();
  const wanted = language === "kk" ? ["kk", "kaz"] : language === "en" ? ["en"] : ["ru"];
  const match = voices.find((voice) => {
    const hay = `${voice.lang} ${voice.name}`.toLowerCase();
    return wanted.some((code) => hay.includes(code));
  });
  if (match) return match;
  if (language === "kk") {
    return voices.find((voice) => voice.lang.toLowerCase().startsWith("ru")) ?? null;
  }
  return null;
}

let activeUtterance: SpeechSynthesisUtterance | null = null;

export function speakText(text: string, locale: string, onEnd?: () => void): boolean {
  if (!isSpeechSupported()) return false;
  stopSpeaking();
  const utterance = new SpeechSynthesisUtterance(text);
  const voice = pickSpeechVoice(locale);
  if (voice) utterance.voice = voice;
  utterance.lang = voice?.lang || (locale === "kk" ? "ru-RU" : speechLanguage(locale));
  utterance.rate = 0.96;
  if (onEnd) {
    utterance.onend = () => {
      if (activeUtterance !== utterance) return;
      activeUtterance = null;
      onEnd();
    };
    utterance.onerror = () => {
      if (activeUtterance !== utterance) return;
      activeUtterance = null;
      onEnd();
    };
  }
  activeUtterance = utterance;
  window.speechSynthesis.speak(utterance);
  return true;
}

export function stopSpeaking(): void {
  if (!isSpeechSupported()) return;
  if (activeUtterance) {
    activeUtterance.onend = null;
    activeUtterance.onerror = null;
    activeUtterance = null;
  }
  window.speechSynthesis.cancel();
}
