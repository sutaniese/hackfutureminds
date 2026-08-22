"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useI18n } from "@/i18n/I18nProvider";
import { readJsonResponse } from "@/lib/http-json";
import { LS_VOICE } from "@/lib/pw-storage";

type VoiceIntent =
  | { action: "navigate"; path: string; speak: string }
  | {
      action: "search_grants";
      path: "/grants";
      query?: string;
      match?: "all" | "high" | "medium" | "low";
      type?: "all" | "monthly" | "full" | "one_time";
      openFirst?: boolean;
      speak: string;
    }
  | { action: "explain"; speak: string };

declare global {
  interface Window {
    SpeechRecognition?: unknown;
    webkitSpeechRecognition?: unknown;
  }
}

function recognitionLanguage(locale: string) {
  if (locale === "en") return "en-US";
  if (locale === "kk") return "kk-KZ";
  return "ru-RU";
}

function speak(text: string, locale: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = recognitionLanguage(locale);
  utterance.rate = 0.96;
  window.speechSynthesis.speak(utterance);
}

function grantUrl(intent: Extract<VoiceIntent, { action: "search_grants" }>) {
  const params = new URLSearchParams();
  if (intent.query) params.set("q", intent.query);
  if (intent.match) params.set("match", intent.match);
  if (intent.type) params.set("type", intent.type);
  if (intent.openFirst) params.set("openFirst", "1");
  const query = params.toString();
  return query ? `/grants?${query}` : "/grants";
}

export function VoiceAssistant() {
  const router = useRouter();
  const pathname = usePathname() || "/";
  const { locale, t } = useI18n();
  const [enabled, setEnabled] = useState(false);
  const [listening, setListening] = useState(false);
  const [busy, setBusy] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [typedCommand, setTypedCommand] = useState("");
  const [message, setMessage] = useState("");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const stopTimerRef = useRef<number | null>(null);

  const supported = useMemo(() => {
    if (typeof window === "undefined") return false;
    return typeof navigator.mediaDevices?.getUserMedia === "function" && typeof window.MediaRecorder !== "undefined";
  }, []);

  useEffect(() => {
    try {
      setEnabled(localStorage.getItem(LS_VOICE) === "1");
    } catch {
      setEnabled(false);
    }
  }, []);

  useEffect(() => {
    function sync() {
      try {
        setEnabled(localStorage.getItem(LS_VOICE) === "1");
      } catch {
        setEnabled(false);
      }
    }
    window.addEventListener("storage", sync);
    window.addEventListener("pathwise:voice-toggle", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("pathwise:voice-toggle", sync);
    };
  }, []);

  const executeIntent = useCallback(
    (intent: VoiceIntent) => {
      speak(intent.speak, locale);
      setMessage(intent.speak);

      if (intent.action === "navigate") {
        router.push(intent.path);
        return;
      }

      if (intent.action === "search_grants") {
        router.push(grantUrl(intent));
      }
    },
    [locale, router],
  );

  const submitCommand = useCallback(
    async (command: string) => {
      const clean = command.trim();
      if (!clean) return;
      setBusy(true);
      setMessage(t("a11y.voiceThinking"));
      try {
        const response = await fetch("/api/voice-command", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ command: clean, pathname, locale }),
        });
        const json = await readJsonResponse<{ intent?: VoiceIntent; error?: string }>(response);
        if ("error" in json && !("intent" in json)) {
          throw new Error((json as { error: string }).error);
        }
        const body = json as { intent?: VoiceIntent; error?: string };
        if (!response.ok || !body.intent) {
          throw new Error(body.error || "Voice assistant failed.");
        }
        executeIntent(body.intent);
      } catch (error) {
        const fallback = error instanceof Error ? error.message : "Voice assistant failed.";
        setMessage(fallback);
        speak(fallback, locale);
      } finally {
        setBusy(false);
      }
    },
    [executeIntent, locale, pathname, t],
  );

  const transcribeAudio = useCallback(
    async (audio: Blob) => {
      setBusy(true);
      setMessage(t("a11y.voiceTranscribing"));
      try {
        const formData = new FormData();
        formData.set("audio", audio, "voice-command.webm");
        formData.set("locale", locale);
        const response = await fetch("/api/voice-transcribe", {
          method: "POST",
          body: formData,
        });
        const json = await readJsonResponse<{ transcript?: string; error?: string }>(response);
        if ("error" in json && !("transcript" in json)) {
          throw new Error((json as { error: string }).error);
        }
        const body = json as { transcript?: string; error?: string };
        if (!response.ok || !body.transcript) {
          throw new Error(body.error || "Groq transcription failed.");
        }
        setTranscript(body.transcript);
        await submitCommand(body.transcript);
      } catch (error) {
        const fallback = error instanceof Error ? error.message : "Groq transcription failed.";
        setMessage(fallback);
        speak(fallback, locale);
      } finally {
        setBusy(false);
      }
    },
    [locale, submitCommand, t],
  );

  const cleanupStream = useCallback(() => {
    if (stopTimerRef.current !== null) {
      window.clearTimeout(stopTimerRef.current);
      stopTimerRef.current = null;
    }
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;
  }, []);

  const startListening = useCallback(async () => {
    if (!supported || listening || busy) return;
    chunksRef.current = [];
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        cleanupStream();
        const audio = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        chunksRef.current = [];
        if (audio.size > 0) void transcribeAudio(audio);
      };
      recorder.onerror = () => {
        cleanupStream();
        setListening(false);
        setMessage(t("a11y.voiceMicFail"));
      };
      recorder.start();
      setTranscript("");
      setMessage(t("a11y.voiceListening"));
      setListening(true);
      stopTimerRef.current = window.setTimeout(() => {
        if (mediaRecorderRef.current?.state === "recording") {
          mediaRecorderRef.current.stop();
          mediaRecorderRef.current = null;
          setListening(false);
        }
      }, 5500);
    } catch {
      setListening(false);
      cleanupStream();
      setMessage(t("a11y.voiceMicBlocked"));
    }
  }, [busy, cleanupStream, listening, supported, t, transcribeAudio]);

  const stopListening = useCallback(() => {
    if (stopTimerRef.current !== null) {
      window.clearTimeout(stopTimerRef.current);
      stopTimerRef.current = null;
    }
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    mediaRecorderRef.current = null;
    setListening(false);
  }, []);

  if (!enabled) return null;

  return (
    <section
      className="fixed bottom-[calc(var(--pw-nav)+1.8rem)] left-4 right-4 z-50 mx-auto max-w-xl rounded-[1.5rem] border border-slate-200 bg-white/95 p-3 shadow-[0_18px_60px_rgb(15_23_42_/_0.18)]"
      aria-live="polite"
      aria-label={t("a11y.voiceTitle")}
    >
      <div className="flex items-center gap-3">
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${listening ? "bg-[#FF6B6B]" : "bg-[#6C63FF]"} text-white shadow-sm`}>
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5" aria-hidden>
            <path d="M7 4a3 3 0 016 0v4a3 3 0 01-6 0V4zm3 10a5 5 0 005-5h-2a3 3 0 01-6 0H5a5 5 0 005 5zm-1 2v2h2v-2h-2z" />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-pathwise-accent-strong">
            {t("a11y.voiceTitle")}
          </p>
          <p className="truncate text-sm font-semibold text-pathwise-ink">
            {transcript || message || t("a11y.voiceReady")}
          </p>
          <p className="text-xs text-pathwise-muted">{t("a11y.voiceHint")}</p>
        </div>
        <button
          type="button"
          onClick={listening ? stopListening : startListening}
          disabled={!supported || busy}
          className="inline-flex min-h-12 shrink-0 items-center justify-center rounded-full bg-[#6C63FF] px-4 text-sm font-bold text-white shadow-sm transition hover:bg-[#5B54D8] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? "…" : listening ? t("a11y.voiceStop") : t("a11y.voiceSpeak")}
        </button>
      </div>
      <form
        className="mt-3 flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          void submitCommand(typedCommand);
          setTypedCommand("");
        }}
      >
        <label className="sr-only" htmlFor="voice-command-text">
          {t("a11y.voiceTypeLabel")}
        </label>
        <input
          id="voice-command-text"
          value={typedCommand}
          onChange={(event) => setTypedCommand(event.target.value)}
          className="pw-input min-h-12 flex-1 px-4 py-2 text-sm"
          placeholder={t("a11y.voicePlaceholder")}
        />
        <button
          type="submit"
          disabled={busy || !typedCommand.trim()}
          className="inline-flex min-h-12 items-center justify-center rounded-full border border-slate-200 bg-white px-4 text-sm font-bold text-pathwise-ink transition hover:bg-slate-50 disabled:opacity-50"
        >
          {t("a11y.voiceRun")}
        </button>
      </form>
      {!supported ? (
        <p className="mt-2 rounded-2xl bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
          {t("a11y.voiceNoRecorder")}
        </p>
      ) : null}
    </section>
  );
}
