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

export function speakText(text: string, locale: string, onEnd?: () => void): void {
  if (!isSpeechSupported()) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = speechLanguage(locale);
  utterance.rate = 0.96;
  if (onEnd) {
    utterance.onend = () => onEnd();
    utterance.onerror = () => onEnd();
  }
  window.speechSynthesis.speak(utterance);
}

export function stopSpeaking(): void {
  if (!isSpeechSupported()) return;
  window.speechSynthesis.cancel();
}
