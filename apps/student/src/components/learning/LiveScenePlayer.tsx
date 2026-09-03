"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  CLIP_STAGE,
  sceneDurationMs,
  type LiveClipScene,
  type LiveClipScript,
} from "@pathwise/shared";
import { useI18n } from "@/i18n/I18nProvider";
import { AnswerField } from "@/components/learning/AnswerField";
import { isAnswerCorrect, type Task } from "@/lib/learning/types";
import { recordClipEvent } from "@/lib/learning/remote";
import { isSpeechSupported, speakText, stopSpeaking } from "@/lib/speech";

function taskFromScript(script: LiveClipScript, topicId: string): Task {
  return {
    id: `${topicId}-clip-quiz`,
    topicId,
    type: "single",
    difficulty: 1,
    skill: script.quiz.skillId,
    prompt: script.quiz.question,
    options: [...script.quiz.options],
    answer: script.quiz.correctIndex,
    explanation: script.quiz.explanation,
    minutes: 1,
  };
}

function bulletLines(scene: LiveClipScene): string[] {
  const raw = scene.body || scene.narration;
  const lines = raw
    .split(/\n+|;\s+|(?<=[.!?])\s+/)
    .map((line) => line.trim())
    .filter((line) => line.length > 2);
  return lines.slice(0, 4);
}

function compareParts(scene: LiveClipScene): { left: string; right: string } {
  const raw = scene.body || scene.narration;
  const parts = raw.split(/\n+|—|–|\svs\.?\s|\sversus\s/i).map((part) => part.trim()).filter(Boolean);
  return { left: parts[0] || raw, right: parts[1] || parts[0] || raw };
}

function SceneVisual({ scene, accent }: { scene: LiveClipScene; accent: string }) {
  if (scene.visual === "formula") {
    return (
      <div className="live-clip-enter flex flex-col gap-4">
        <p className="text-[11px] font-black uppercase tracking-[0.18em]" style={{ color: accent }}>
          {CLIP_STAGE.wordmark}
        </p>
        <h3 className="text-[1.7rem] font-black leading-tight tracking-tight text-[#F7F6FF]">{scene.heading}</h3>
        {scene.formula ? (
          <div
            className="live-clip-enter-d1 rounded-[20px] px-5 py-4 font-mono text-[1.15rem] font-bold leading-snug text-[#F7F6FF]"
            style={{ background: "#100E1C", borderLeft: `8px solid ${CLIP_STAGE.purple}` }}
          >
            {scene.formula}
          </div>
        ) : null}
        {scene.body ? <p className="live-clip-enter-d2 text-[1.05rem] font-semibold leading-7 text-[#C7C3E0]">{scene.body}</p> : null}
      </div>
    );
  }

  if (scene.visual === "compare") {
    const { left, right } = compareParts(scene);
    return (
      <div className="live-clip-enter flex flex-col gap-4">
        <p className="text-[11px] font-black uppercase tracking-[0.18em]" style={{ color: accent }}>
          {scene.heading}
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div className="live-clip-enter-d1 rounded-[22px] border-2 p-4" style={{ background: CLIP_STAGE.card, borderColor: CLIP_STAGE.cardLine }}>
            <p className="text-[11px] font-black uppercase tracking-[0.14em]" style={{ color: accent }}>A</p>
            <p className="mt-2 text-[0.95rem] font-bold leading-6 text-[#F7F6FF]">{left}</p>
          </div>
          <div className="live-clip-enter-d2 rounded-[22px] border-2 p-4" style={{ background: CLIP_STAGE.card, borderColor: CLIP_STAGE.cardLine }}>
            <p className="text-[11px] font-black uppercase tracking-[0.14em]" style={{ color: accent }}>B</p>
            <p className="mt-2 text-[0.95rem] font-bold leading-6 text-[#F7F6FF]">{right}</p>
          </div>
        </div>
      </div>
    );
  }

  if (scene.visual === "diagram") {
    const nodes = bulletLines(scene).slice(0, 3);
    return (
      <div className="live-clip-enter flex flex-col gap-4">
        <h3 className="text-[1.6rem] font-black leading-tight text-[#F7F6FF]">{scene.heading}</h3>
        <div className="flex flex-col gap-3">
          {nodes.map((node, index) => (
            <div
              key={`${node}-${index}`}
              className={`flex items-start gap-3 rounded-[22px] border-2 px-4 py-3 live-clip-enter-d${index + 1}`}
              style={{ background: CLIP_STAGE.card, borderColor: CLIP_STAGE.cardLine }}
            >
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl text-sm font-black text-white"
                style={{ background: accent }}
              >
                {index + 1}
              </span>
              <p className="text-[0.98rem] font-bold leading-6 text-[#F7F6FF]">{node}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="live-clip-enter flex flex-col gap-4">
      <h3 className="text-[1.6rem] font-black leading-tight text-[#F7F6FF]">{scene.heading}</h3>
      <div className="flex flex-col gap-3">
        {bulletLines(scene).map((line, index) => (
          <div
            key={`${line}-${index}`}
            className={`rounded-[22px] border-2 px-4 py-3 live-clip-enter-d${index + 1}`}
            style={{ background: CLIP_STAGE.card, borderColor: CLIP_STAGE.cardLine }}
          >
            <p className="text-[1.02rem] font-bold leading-6 text-[#F7F6FF]">{line}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function LiveScenePlayer({
  script,
  topicId,
  quizTask,
  onWrongAnswer,
  logEvents = true,
  preview = false,
}: {
  script: LiveClipScript;
  topicId: string;
  quizTask?: Task | null;
  onWrongAnswer?: () => void;
  logEvents?: boolean;
  preview?: boolean;
}) {
  const { t } = useI18n();
  const [phase, setPhase] = useState<"idle" | "play" | "paused" | "quiz">("idle");
  const [sceneIndex, setSceneIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [quizDone, setQuizDone] = useState<null | boolean>(null);
  const startedRef = useRef(false);
  const completedRef = useRef(false);
  const advanceRef = useRef<(() => void) | null>(null);
  const timerRef = useRef<number | null>(null);
  const clipId = `live-${topicId}`;
  const scene = script.scenes[sceneIndex];
  const quiz = quizTask ?? taskFromScript(script, topicId);
  const progress = script.scenes.length === 0 ? 0 : (sceneIndex + (phase === "quiz" ? 1 : 0)) / script.scenes.length;

  const fire = useCallback(
    (event: "start" | "complete" | "drop" | "quiz_right" | "quiz_wrong") => {
      if (!logEvents) return;
      void recordClipEvent({ clipId, topicId, event });
    },
    [clipId, logEvents, topicId],
  );

  const clearTimer = useCallback(() => {
    if (timerRef.current != null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const finishClip = useCallback(() => {
    if (!completedRef.current) {
      completedRef.current = true;
      fire("complete");
    }
    stopSpeaking();
    clearTimer();
    setPhase("quiz");
  }, [clearTimer, fire]);

  const goNext = useCallback(() => {
    if (sceneIndex >= script.scenes.length - 1) {
      finishClip();
      return;
    }
    setSceneIndex((index) => index + 1);
  }, [finishClip, sceneIndex, script.scenes.length]);

  advanceRef.current = goNext;

  const playScene = useCallback(
    (index: number) => {
      const current = script.scenes[index];
      if (!current) {
        finishClip();
        return;
      }
      clearTimer();
      stopSpeaking();
      const fallbackMs = sceneDurationMs(current.narration);
      let ended = false;
      const finish = () => {
        if (ended || phase === "paused") return;
        ended = true;
        advanceRef.current?.();
      };
      timerRef.current = window.setTimeout(finish, fallbackMs);
      if (isSpeechSupported()) {
        speakText(current.narration, script.language, finish);
      }
    },
    [clearTimer, finishClip, phase, script.language, script.scenes],
  );

  useEffect(() => {
    if (phase !== "play") return;
    playScene(sceneIndex);
    return () => {
      clearTimer();
      stopSpeaking();
    };
  }, [clearTimer, phase, playScene, sceneIndex]);

  useEffect(() => {
    return () => {
      stopSpeaking();
      if (startedRef.current && !completedRef.current) fire("drop");
    };
  }, [fire]);

  const start = () => {
    if (!startedRef.current) {
      startedRef.current = true;
      fire("start");
    }
    setPhase("play");
  };

  const pause = () => {
    stopSpeaking();
    clearTimer();
    setPhase("paused");
  };

  const replay = () => {
    stopSpeaking();
    clearTimer();
    completedRef.current = false;
    setQuizDone(null);
    setAnswer("");
    setSceneIndex(0);
    setPhase("play");
    if (!startedRef.current) {
      startedRef.current = true;
      fire("start");
    }
  };

  const accent = CLIP_STAGE.purple;

  return (
    <div className={preview ? "w-full overflow-hidden rounded-[1.6rem] border-4 border-slate-900 bg-slate-950" : "w-full max-w-[390px] overflow-hidden rounded-[2.4rem] border-8 border-slate-900 bg-slate-950 shadow-2xl"}>
      <div className="relative aspect-[9/16] w-full bg-black text-white">
      <div
        className="relative flex h-full min-h-[520px] flex-col px-5 pb-6 pt-8"
        style={{ background: `linear-gradient(180deg, ${CLIP_STAGE.inkSoft} 0%, ${CLIP_STAGE.ink} 100%)` }}
      >
        <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full bg-[#6C63FF] transition-all duration-500" style={{ width: `${Math.round(progress * 100)}%` }} />
        </div>

        {phase === "quiz" ? (
          <div className="mt-auto rounded-2xl bg-white p-4 text-slate-900">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#554dd6]">{t("clips.quizNow")}</p>
            <p className="mt-2 text-sm font-black">{quiz.prompt}</p>
            <AnswerField task={quiz} value={answer} onChange={setAnswer} />
            <button
              type="button"
              disabled={answer === "" || quizDone !== null}
              onClick={() => {
                const ok = isAnswerCorrect(quiz, answer);
                setQuizDone(ok);
                fire(ok ? "quiz_right" : "quiz_wrong");
                if (!ok) onWrongAnswer?.();
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
          </div>
        ) : (
          <>
            {scene ? <SceneVisual scene={scene} accent={accent} /> : null}
            <div className="mt-auto space-y-3">
              <div className="rounded-2xl bg-black/35 px-4 py-3">
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#A99CFF]">
                  {t("clips.beatLine", { label: scene?.heading ?? "", a: sceneIndex + 1, b: script.scenes.length })}
                </p>
                <p className="mt-1 text-sm font-semibold leading-6 text-[#F7F6FF]">{scene?.narration}</p>
              </div>
              <div className="flex gap-2">
                {phase === "idle" ? (
                  <button type="button" onClick={start} className="min-h-12 flex-1 rounded-full bg-[#6C63FF] text-sm font-bold text-white">
                    {t("clips.tapToPlay")}
                  </button>
                ) : null}
                {phase === "play" ? (
                  <button type="button" onClick={pause} className="min-h-12 flex-1 rounded-full bg-white/10 text-sm font-bold text-white">
                    {t("clips.pause")}
                  </button>
                ) : null}
                {phase === "paused" ? (
                  <button type="button" onClick={start} className="min-h-12 flex-1 rounded-full bg-[#6C63FF] text-sm font-bold text-white">
                    {t("clips.tapToPlay")}
                  </button>
                ) : null}
                <button type="button" onClick={replay} className="min-h-12 flex-1 rounded-full bg-white/10 text-sm font-bold text-white">
                  {t("clips.replay")}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
      </div>
    </div>
  );
}
