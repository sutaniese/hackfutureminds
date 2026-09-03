"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { liveClipQuizTask, sceneDurationMs, type LiveClipScript } from "@pathwise/shared";
import { useI18n } from "@/i18n/I18nProvider";
import { AnswerField } from "@/components/learning/AnswerField";
import { isAnswerCorrect, type Task } from "@/lib/learning/types";
import { recordClipEvent } from "@/lib/learning/remote";
import {
  pauseSpeech,
  resumeSpeech,
  speakNarration,
  waitForVoices,
} from "@/lib/learning/clips/speech";
import { SceneVisual } from "./visuals";
import "./live-clip.css";

type Phase = "idle" | "play" | "quiz";

export function LiveClipPlayer({
  script,
  topicId,
  clipId,
  preview,
  onWrongAnswer,
}: {
  script: LiveClipScript;
  topicId: string;
  clipId?: string;
  preview?: boolean;
  onWrongAnswer?: (skillId: string) => void;
}) {
  const { t } = useI18n();
  const [phase, setPhase] = useState<Phase>("idle");
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [answer, setAnswer] = useState("");
  const [quizDone, setQuizDone] = useState<null | boolean>(null);
  const [voiceNote, setVoiceNote] = useState<string | null>(null);
  const startedRef = useRef(false);
  const completedRef = useRef(false);
  const stuckRef = useRef(false);
  const spokenEndRef = useRef(false);
  const cancelRef = useRef<() => void>(() => undefined);
  const clipIdRef = useRef(clipId || `live-${topicId}`);
  const pausedRef = useRef(false);

  const scene = script.scenes[index];
  const quizTask = liveClipQuizTask(script, topicId) as Task;
  const progress = script.scenes.length === 0 ? 0 : ((index + (phase === "quiz" ? 1 : 0.35)) / script.scenes.length) * 100;

  const fire = useCallback(
    (event: "start" | "complete" | "drop" | "quiz_right" | "quiz_wrong" | "stuck") => {
      if (preview) return;
      void recordClipEvent({ clipId: clipIdRef.current, topicId, event });
    },
    [preview, topicId],
  );

  const stopTalking = useCallback(() => {
    cancelRef.current();
  }, []);

  useEffect(() => {
    clipIdRef.current = clipId || `live-${topicId}`;
  }, [clipId, topicId]);

  useEffect(() => {
    return () => {
      stopTalking();
      if (startedRef.current && !completedRef.current) fire("drop");
    };
  }, [fire, stopTalking]);

  const finish = useCallback(() => {
    if (!completedRef.current) {
      completedRef.current = true;
      fire("complete");
    }
    setPhase("quiz");
  }, [fire]);

  const goNext = useCallback(() => {
    setIndex((current) => {
      if (current >= script.scenes.length - 1) {
        finish();
        return current;
      }
      return current + 1;
    });
  }, [finish, script.scenes.length]);

  useEffect(() => {
    if (phase !== "play" || paused || !scene) return;
    spokenEndRef.current = false;
    let cancelled = false;
    const expected = sceneDurationMs(scene.narration);
    void waitForVoices().then(() => {
      if (cancelled) return;
      const { cancel, pick } = speakNarration(scene.narration, script.language, () => {
        spokenEndRef.current = true;
        if (!cancelled && !pausedRef.current) goNext();
      });
      cancelRef.current = cancel;
      setVoiceNote(pick.usedRussianFallback ? t("clips.voiceKkFallback") : null);
    });
    const fallback = window.setTimeout(() => {
      if (cancelled || pausedRef.current) return;
      if (!spokenEndRef.current) goNext();
    }, expected);
    const stuck = window.setTimeout(() => {
      if (cancelled || stuckRef.current || spokenEndRef.current) return;
      stuckRef.current = true;
      fire("stuck");
    }, expected * 2);
    return () => {
      cancelled = true;
      window.clearTimeout(fallback);
      window.clearTimeout(stuck);
      stopTalking();
    };
  }, [fire, goNext, phase, scene, script.language, stopTalking, t]);

  const start = () => {
    if (!startedRef.current) {
      startedRef.current = true;
      fire("start");
    }
    setPaused(false);
    setPhase("play");
  };

  const togglePause = () => {
    setPaused((value) => {
      const next = !value;
      pausedRef.current = next;
      if (next) pauseSpeech();
      else resumeSpeech();
      return next;
    });
  };

  const replay = () => {
    stopTalking();
    completedRef.current = false;
    stuckRef.current = false;
    setIndex(0);
    setAnswer("");
    setQuizDone(null);
    setPaused(false);
    setPhase("play");
    if (!startedRef.current) {
      startedRef.current = true;
      fire("start");
    }
  };

  return (
    <div className="live-clip-stage overflow-hidden rounded-[2rem] border-8 border-slate-900 shadow-2xl">
      <div className="relative aspect-[9/16] w-full">
        <div className="absolute inset-x-0 top-0 z-10 h-1 bg-white/10">
          <div className="h-full bg-[#6C63FF] transition-all" style={{ width: `${Math.min(100, progress)}%` }} />
        </div>

        {phase === "idle" ? (
          <button
            type="button"
            onClick={start}
            className="flex h-full w-full flex-col items-center justify-center gap-4 px-8 text-center"
          >
            <span className="text-[11px] font-black uppercase tracking-[0.18em] text-[#A99CFF]">{t("clips.liveLabel")}</span>
            <h2 className="text-3xl font-black leading-tight">{script.title}</h2>
            <p className="text-sm text-[#C7C3E0]">{t("clips.tapStart")}</p>
            <span className="inline-flex min-h-12 items-center rounded-full bg-[#6C63FF] px-6 text-sm font-bold">
              {t("topic.watchClip")}
            </span>
          </button>
        ) : null}

        {phase === "play" && scene ? (
          <div className="flex h-full flex-col px-5 pb-6 pt-8">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#A99CFF]">
              {t("clips.sceneProgress", { a: index + 1, b: script.scenes.length })}
            </p>
            <h2 className="mt-2 text-2xl font-black leading-tight">{scene.heading}</h2>
            <div className="mt-5 flex-1">
              <SceneVisual scene={scene} />
            </div>
            <p className="mt-4 rounded-2xl bg-white/5 px-4 py-3 text-sm leading-6 text-[#F7F6FF]" aria-live="polite">
              {scene.narration}
            </p>
            {voiceNote ? <p className="mt-2 text-xs text-[#C7C3E0]">{voiceNote}</p> : null}
            <div className="mt-4 flex gap-2">
              <button type="button" onClick={togglePause} className="min-h-11 flex-1 rounded-full bg-white/10 text-sm font-bold">
                {paused ? t("clips.resume") : t("clips.pause")}
              </button>
              <button type="button" onClick={replay} className="min-h-11 flex-1 rounded-full bg-[#6C63FF] text-sm font-bold">
                {t("clips.restart")}
              </button>
            </div>
          </div>
        ) : null}

        {phase === "quiz" ? (
          <div className="flex h-full flex-col justify-end bg-gradient-to-t from-black via-black/80 to-transparent p-5">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#A99CFF]">{t("clips.quizNow")}</p>
            <h2 className="mt-2 text-2xl font-black leading-tight">{script.title}</h2>
            <div className="mt-4 rounded-2xl bg-white p-4 text-slate-900">
              <p className="text-sm font-black">{quizTask.prompt}</p>
              <AnswerField task={quizTask} value={answer} onChange={setAnswer} />
              <button
                type="button"
                disabled={answer === "" || quizDone !== null}
                onClick={() => {
                  const ok = isAnswerCorrect(quizTask, answer);
                  setQuizDone(ok);
                  fire(ok ? "quiz_right" : "quiz_wrong");
                  if (!ok) onWrongAnswer?.(script.quiz.skillId);
                }}
                className="pw-btn-primary mt-3 w-full text-sm disabled:opacity-50"
              >
                {t("clips.answer")}
              </button>
              {quizDone !== null ? (
                <p className={`mt-2 text-sm font-bold ${quizDone ? "text-emerald-600" : "text-[#E75555]"}`}>
                  {quizDone ? t("clips.ok") : t("clips.bad")}
                </p>
              ) : null}
              <button type="button" onClick={replay} className="mt-3 w-full text-xs font-bold text-[#554dd6]">
                {t("clips.restart")}
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
