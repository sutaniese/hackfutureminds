"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useI18n } from "@/i18n/I18nProvider";
import { useAuth } from "@/components/shell/useAuth";
import { useLearning } from "@/components/learning/useLearning";
import { speakText, stopSpeaking } from "@/lib/speech";
import { readJsonResponse } from "@/lib/http-json";
import { canStartListening, phaseAfterInterrupt, type VoicePhase } from "@/lib/voice/machine";
import { prefersReducedMotion, waveDisplay } from "@/lib/voice/meter";
import { useTapMic } from "@/lib/voice/use-tap-mic";
import { SoundWaves } from "./SoundWaves";

type ChatTurn = { role: "user" | "assistant"; text: string };

export function VoiceCoach({ embedded = false, active = true }: { embedded?: boolean; active?: boolean }) {
  const { t, locale } = useI18n();
  const { user } = useAuth();
  const { profile, state, topics } = useLearning();
  const [open, setOpen] = useState(embedded);
  const [phase, setPhase] = useState<VoicePhase>("idle");
  const [typed, setTyped] = useState("");
  const [history, setHistory] = useState<ChatTurn[]>([]);
  const [reduced, setReduced] = useState(false);
  const tokenRef = useRef(0);

  const bump = () => {
    tokenRef.current += 1;
    return tokenRef.current;
  };

  const weakTopics = useMemo(() => {
    return Object.entries(state.topics)
      .filter(([, row]) => row.attempts > 0 && row.correct / Math.max(1, row.attempts) < 0.5)
      .map(([id]) => topics.find((topic) => topic.id === id)?.title ?? id)
      .slice(0, 6);
  }, [state.topics, topics]);

  const send = useCallback(
    async (text: string, token: number) => {
      const message = text.trim();
      if (!message) return;
      setPhase("processing");
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
        if (tokenRef.current !== token) return;
        const reply =
          "reply" in data && data.reply
            ? data.reply
            : "error" in data
              ? data.error
              : t("voiceCoach.fail");
        const line = reply || t("voiceCoach.fail");
        setHistory((prev) => [...prev, { role: "assistant", text: line }]);
        setPhase("speaking");
        const spoken = speakText(line, locale, () => {
          if (tokenRef.current !== token) return;
          setPhase("idle");
        });
        if (!spoken) setPhase("idle");
      } catch {
        if (tokenRef.current !== token) return;
        setHistory((prev) => [...prev, { role: "assistant", text: t("voiceCoach.fail") }]);
        setPhase("error");
      }
    },
    [history, locale, profile?.grade, profile?.subjectId, t, topics, weakTopics],
  );

  const onAudio = useCallback(
    async (audio: Blob) => {
      const token = tokenRef.current;
      setPhase("processing");
      try {
        const form = new FormData();
        form.set("audio", audio, "coach.webm");
        form.set("locale", locale);
        const response = await fetch("/api/voice-transcribe", { method: "POST", body: form });
        const data = await readJsonResponse<{ transcript?: string; error?: string }>(response);
        if (tokenRef.current !== token) return;
        const line = "transcript" in data ? data.transcript?.trim() : "";
        if (!line) {
          setPhase("error");
          setHistory((prev) => [...prev, { role: "assistant", text: t("voiceCoach.sttFail") }]);
          return;
        }
        await send(line, token);
      } catch {
        if (tokenRef.current !== token) return;
        setPhase("error");
        setHistory((prev) => [...prev, { role: "assistant", text: t("voiceCoach.sttFail") }]);
      }
    },
    [locale, send, t],
  );

  const mic = useTapMic({
    active: active && (embedded || open),
    captureWave: true,
    onAudio,
    onStopped: (kind) => {
      if (kind === "send") setPhase("processing");
    },
  });

  useEffect(() => {
    setReduced(prefersReducedMotion());
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (!active) {
      bump();
      stopSpeaking();
      mic.stop("discard");
      setPhase("idle");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when the tab hides
  }, [active]);

  const interrupt = () => {
    bump();
    stopSpeaking();
    mic.stop("discard");
    setPhase(phaseAfterInterrupt());
  };

  const toggleMic = () => {
    if (phase === "speaking") return;
    if (mic.listening) {
      mic.stop("send");
      setPhase("processing");
      return;
    }
    if (!canStartListening(phase) && phase !== "error") return;
    bump();
    void mic.start().then((ok) => setPhase(ok ? "listening" : "idle"));
  };

  const title = user?.role === "teacher" ? t("voiceCoach.teacherTitle") : t("voiceCoach.studentTitle");
  const waveMode = waveDisplay(mic.listening ? "listening" : phase, reduced, "coach");
  const typeFallback = mic.denied || !mic.supported;
  const shown = embedded || open;

  return (
    <div className="pointer-events-auto flex flex-col items-end gap-2">
      {shown ? (
        <section
          className={`${embedded ? "w-full rounded-none border-0 shadow-none" : "w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-slate-200 bg-white/95 shadow-xl"} overflow-hidden`}
          aria-label={title}
        >
          <div className={`flex items-center justify-between border-b border-slate-100 px-3 py-2 ${embedded ? "hidden" : ""}`}>
            <p className="text-sm font-bold text-pathwise-ink">{title}</p>
            <button type="button" onClick={() => setOpen(false)} className="min-h-11 min-w-11 px-2 text-sm font-semibold">
              {t("voiceCoach.close")}
            </button>
          </div>
          <div className="px-3 pt-2">
            <SoundWaves points={mic.points} mode={waveMode} label={t("voiceDock.listening")} />
            {phase === "processing" ? (
              <p className="flex min-h-11 items-center gap-2 text-sm font-semibold text-pathwise-muted" role="status">
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-[#6C63FF] border-t-transparent" />
                {t("voiceDock.processing")}
              </p>
            ) : null}
            {phase === "speaking" ? (
              <p className="text-sm font-semibold text-pathwise-ink" role="status">
                {t("voiceDock.speaking")}
              </p>
            ) : null}
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
          </div>
          {typeFallback ? (
            <form
              className="flex gap-2 border-t border-slate-100 p-3"
              onSubmit={(event) => {
                event.preventDefault();
                const token = bump();
                void send(typed, token);
                setTyped("");
              }}
            >
              <input
                value={typed}
                onChange={(event) => setTyped(event.target.value)}
                className="pw-input min-h-11 flex-1 px-3 text-sm"
                placeholder={t("voiceCoach.typePh")}
              />
              <button type="submit" className="pw-btn-primary min-h-11 min-w-11 px-3 text-sm">
                {t("voiceCoach.send")}
              </button>
            </form>
          ) : (
            <div className="flex flex-col items-center gap-2 border-t border-slate-100 p-3">
              {phase === "speaking" ? (
                <button
                  type="button"
                  onClick={interrupt}
                  className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-[#E75555] text-sm font-bold text-white"
                >
                  {t("voiceDock.interrupt")}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={toggleMic}
                  disabled={phase === "processing"}
                  aria-pressed={mic.listening}
                  className={`inline-flex h-20 w-20 items-center justify-center rounded-full text-white shadow-md ${
                    mic.listening ? "bg-[#E75555]" : "bg-[#6C63FF]"
                  } disabled:opacity-60`}
                  aria-label={mic.listening ? t("voiceCoach.stopSend") : t("voiceCoach.tap")}
                >
                  <svg viewBox="0 0 24 24" className="h-9 w-9" fill="currentColor" aria-hidden>
                    <path d="M12 3a4 4 0 00-4 4v5a4 4 0 008 0V7a4 4 0 00-4-4zm-7 9a1 1 0 012 0 5 5 0 0010 0 1 1 0 112 0 7 7 0 01-6 6.93V21h3a1 1 0 110 2H8a1 1 0 110-2h3v-2.07A7 7 0 015 12z" />
                  </svg>
                </button>
              )}
              <p className="text-center text-xs font-semibold text-pathwise-muted">
                {mic.listening ? t("voiceCoach.stopSend") : t("voiceCoach.tap")}
              </p>
              {phase === "error" ? (
                <button
                  type="button"
                  onClick={toggleMic}
                  className="inline-flex min-h-11 w-full items-center justify-center rounded-full border border-slate-200 text-sm font-bold"
                >
                  {t("voiceDock.retry")}
                </button>
              ) : null}
            </div>
          )}
        </section>
      ) : null}
      {embedded ? null : (
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-[#6C63FF] text-white shadow-lg"
          aria-expanded={open}
          aria-label={title}
        >
          🎙
        </button>
      )}
    </div>
  );
}
