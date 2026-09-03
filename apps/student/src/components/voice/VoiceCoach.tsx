"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useI18n } from "@/i18n/I18nProvider";
import { useAuth } from "@/components/shell/useAuth";
import { useLearning } from "@/components/learning/useLearning";
import { speakText } from "@/lib/speech";
import { readJsonResponse } from "@/lib/http-json";

type ChatTurn = { role: "user" | "assistant"; text: string };

export function VoiceCoach() {
  const { t, locale } = useI18n();
  const { user } = useAuth();
  const { profile, state, topics } = useLearning();
  const [open, setOpen] = useState(false);
  const [listening, setListening] = useState(false);
  const [busy, setBusy] = useState(false);
  const [micDenied, setMicDenied] = useState(false);
  const [typed, setTyped] = useState("");
  const [history, setHistory] = useState<ChatTurn[]>([]);
  const [maySpeak, setMaySpeak] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const holdRef = useRef(false);

  const supported = useMemo(() => {
    if (typeof window === "undefined") return false;
    return typeof navigator.mediaDevices?.getUserMedia === "function" && typeof window.MediaRecorder !== "undefined";
  }, []);

  const weakTopics = useMemo(() => {
    return Object.entries(state.topics)
      .filter(([, row]) => row.attempts > 0 && row.correct / Math.max(1, row.attempts) < 0.5)
      .map(([id]) => topics.find((topic) => topic.id === id)?.title ?? id)
      .slice(0, 6);
  }, [state.topics, topics]);

  const send = useCallback(
    async (text: string) => {
      const message = text.trim();
      if (!message || busy) return;
      setBusy(true);
      setHistory((prev) => [...prev, { role: "user", text: message }]);
      try {
        const response = await fetch("/api/coach/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message,
            spoken: true,
            history: history.slice(-8),
            learning: {
              grade: profile?.grade,
              subjectId: profile?.subjectId,
              weakTopics,
              topicTitle: topics[0]?.title,
              theory: topics[0]?.theory?.slice(0, 4),
            },
          }),
        });
        const data = await readJsonResponse<{ reply?: string; error?: string }>(response);
        const reply =
          "reply" in data && data.reply
            ? data.reply
            : "error" in data
              ? data.error
              : t("voiceCoach.fail");
        const line = reply || t("voiceCoach.fail");
        setHistory((prev) => [...prev, { role: "assistant", text: line }]);
        if (maySpeak) speakText(line, locale);
      } catch {
        setHistory((prev) => [...prev, { role: "assistant", text: t("voiceCoach.fail") }]);
      } finally {
        setBusy(false);
      }
    },
    [busy, history, locale, maySpeak, profile?.grade, profile?.subjectId, t, topics, weakTopics],
  );

  const transcribe = useCallback(
    async (audio: Blob) => {
      const form = new FormData();
      form.set("audio", audio, "coach.webm");
      form.set("locale", locale);
      const response = await fetch("/api/voice-transcribe", { method: "POST", body: form });
      const data = await readJsonResponse<{ transcript?: string; error?: string }>(response);
      const line = "transcript" in data ? data.transcript?.trim() : "";
      if (line) await send(line);
      else setHistory((prev) => [...prev, { role: "assistant", text: t("voiceCoach.sttFail") }]);
    },
    [locale, send, t],
  );

  const stopRec = useCallback(() => {
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
    recorderRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setListening(false);
  }, []);

  const startRec = useCallback(async () => {
    if (!supported) {
      setMicDenied(true);
      return;
    }
    try {
      setMaySpeak(true);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const audio = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        chunksRef.current = [];
        if (audio.size > 0) void transcribe(audio);
      };
      recorder.start();
      setListening(true);
      setMicDenied(false);
    } catch {
      setMicDenied(true);
    }
  }, [supported, transcribe]);

  useEffect(() => () => stopRec(), [stopRec]);

  const title =
    user?.role === "teacher" ? t("voiceCoach.teacherTitle") : t("voiceCoach.studentTitle");

  return (
    <div className="pointer-events-auto flex flex-col items-end gap-2">
      {open ? (
        <section
          className="w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white/95 shadow-xl"
          aria-label={title}
        >
          <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2">
            <p className="text-sm font-bold text-pathwise-ink">{title}</p>
            <button type="button" onClick={() => setOpen(false)} className="min-h-11 px-2 text-sm font-semibold">
              {t("voiceCoach.close")}
            </button>
          </div>
          <div className="max-h-56 space-y-2 overflow-y-auto p-3" aria-live="polite">
            {history.length === 0 ? (
              <p className="text-sm text-pathwise-muted">{t("voiceCoach.empty")}</p>
            ) : (
              history.map((turn, index) => (
                <p
                  key={`${turn.role}-${index}`}
                  className={`rounded-xl px-3 py-2 text-sm ${
                    turn.role === "user" ? "ml-6 bg-[#6C63FF] text-white" : "mr-6 bg-slate-50 text-pathwise-ink"
                  }`}
                >
                  {turn.text}
                </p>
              ))
            )}
            {busy ? <p className="text-xs font-semibold text-pathwise-muted">{t("voiceCoach.thinking")}</p> : null}
          </div>
          {micDenied || !supported ? (
            <form
              className="flex gap-2 border-t border-slate-100 p-3"
              onSubmit={(event) => {
                event.preventDefault();
                setMaySpeak(true);
                void send(typed);
                setTyped("");
              }}
            >
              <input
                value={typed}
                onChange={(event) => setTyped(event.target.value)}
                className="pw-input min-h-12 flex-1 px-3 text-sm"
                placeholder={t("voiceCoach.typePh")}
              />
              <button type="submit" className="pw-btn-primary min-h-12 px-3 text-sm">
                {t("voiceCoach.send")}
              </button>
            </form>
          ) : (
            <div className="flex gap-2 border-t border-slate-100 p-3">
              <button
                type="button"
                onPointerDown={() => {
                  holdRef.current = true;
                  void startRec();
                }}
                onPointerUp={() => {
                  if (holdRef.current) stopRec();
                  holdRef.current = false;
                }}
                onClick={() => {
                  if (holdRef.current) return;
                  if (listening) stopRec();
                  else void startRec();
                }}
                className={`min-h-12 flex-1 rounded-full text-sm font-bold text-white ${
                  listening ? "bg-[#E75555]" : "bg-[#6C63FF]"
                }`}
              >
                {listening ? t("voiceCoach.release") : t("voiceCoach.hold")}
              </button>
            </div>
          )}
        </section>
      ) : null}
      <button
        type="button"
        onClick={() => {
          setOpen((prev) => !prev);
          setMaySpeak(true);
        }}
        className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-[#6C63FF] text-white shadow-lg"
        aria-expanded={open}
        aria-label={title}
      >
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor" aria-hidden>
          <path d="M12 3a4 4 0 00-4 4v5a4 4 0 008 0V7a4 4 0 00-4-4zm-7 9a1 1 0 012 0 5 5 0 0010 0 1 1 0 112 0 7 7 0 01-6 6.93V21h3a1 1 0 110 2H8a1 1 0 110-2h3v-2.07A7 7 0 015 12z" />
        </svg>
      </button>
    </div>
  );
}
