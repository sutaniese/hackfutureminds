"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { clipPublicPath, topicHasLiveClip, videoClipFor } from "@pathwise/shared";
import { useI18n } from "@/i18n/I18nProvider";
import { ContentCard } from "@/components/ui/PageHero";
import { AnswerField } from "@/components/learning/AnswerField";
import { Pill } from "@/components/learning/LearningUI";
import { LiveClipPlayer } from "@/components/learning/live-clip/LiveClipPlayer";
import { localClipForTopic } from "@/lib/learning/clips";
import type { LearningClip } from "@/lib/learning/clips/types";
import { BASE_TOPICS, findTask, findTopic, SUBJECTS } from "@/lib/learning/catalog";
import { isAnswerCorrect } from "@/lib/learning/types";
import { recordClipEvent } from "@/lib/learning/remote";
import { weakSpots } from "@/lib/learning/recommend";
import { useLearning } from "./useLearning";

export function ClipPlayer({
  lockedTopicId,
  onWrongAnswer,
}: {
  lockedTopicId?: string;
  onWrongAnswer?: () => void;
} = {}) {
  const { locale, t } = useI18n();
  const { topics, state, profile } = useLearning();
  const clipLocale = locale === "kk" ? "kk" : "ru";
  const [topicId, setTopicId] = useState(lockedTopicId ?? "math-quadratic");
  const [phase, setPhase] = useState<"video" | "quiz" | "fallback">("video");
  const [clip, setClip] = useState<LearningClip | null>(null);
  const [source, setSource] = useState<"video" | "baked" | "ai" | "local">("video");
  const [answer, setAnswer] = useState("");
  const [quizDone, setQuizDone] = useState<null | boolean>(null);
  const [loading, setLoading] = useState(false);
  const [beatIndex, setBeatIndex] = useState(0);
  const startedRef = useRef(false);
  const completedRef = useRef(false);
  const clipIdRef = useRef("clip-math-quadratic");

  const videoMeta = videoClipFor(topicId, clipLocale);
  const videoSrc = clipPublicPath(topicId, clipLocale);
  const topic = findTopic(topics, topicId) ?? findTopic(BASE_TOPICS, topicId);
  const quizTaskId = clip?.quizTaskId || videoMeta?.quizTaskId || topic?.tasks[0]?.id || "";
  const quiz = topic && quizTaskId ? findTask([topic], quizTaskId) ?? topic.tasks[0] : topic?.tasks[0] ?? null;
  const catalogTopic = findTopic(BASE_TOPICS, topicId);
  const beat = clip?.beats[beatIndex];

  const fire = useCallback((event: "start" | "complete" | "drop" | "quiz_right" | "quiz_wrong") => {
    void recordClipEvent({ clipId: clipIdRef.current, topicId, event });
  }, [topicId]);

  const dropIfUnfinished = useCallback(() => {
    if (startedRef.current && !completedRef.current) fire("drop");
  }, [fire]);

  const loadFallback = useCallback(
    async (id: string, forceLive = false) => {
      setLoading(true);
      setPhase("fallback");
      setBeatIndex(0);
      setAnswer("");
      setQuizDone(null);
      try {
        if (!forceLive) {
          const local = localClipForTopic(id, clipLocale);
          if (local.baked) {
            setClip(local);
            setSource("baked");
            clipIdRef.current = local.id;
            return;
          }
        }
        const response = await fetch("/api/clips/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ topicId: id, locale: clipLocale }),
        });
        const data = (await response.json()) as { clip?: LearningClip; source?: "ai" | "local" | "baked" };
        const next = data.clip ?? localClipForTopic(id, clipLocale);
        setClip(next);
        setSource(data.source ?? "local");
        clipIdRef.current = next.id;
      } finally {
        setLoading(false);
      }
    },
    [clipLocale],
  );

  const selectTopic = useCallback(
    (id: string, forceLive = false) => {
      dropIfUnfinished();
      setTopicId(id);
      setAnswer("");
      setQuizDone(null);
      startedRef.current = false;
      completedRef.current = false;
      clipIdRef.current = `clip-${id}${clipLocale === "kk" ? "-kk" : ""}`;
      if (forceLive || !videoClipFor(id, clipLocale)) {
        void loadFallback(id, forceLive);
        return;
      }
      setPhase("video");
      setSource("video");
      setClip(null);
    },
    [clipLocale, dropIfUnfinished, loadFallback],
  );

  useEffect(() => {
    return () => {
      if (startedRef.current && !completedRef.current) {
        void recordClipEvent({ clipId: clipIdRef.current, topicId, event: "drop" });
      }
    };
  }, [topicId]);

  const nextAfterQuiz = useCallback(
    (correct: boolean) => {
      fire(correct ? "quiz_right" : "quiz_wrong");
      if (!correct) {
        if (onWrongAnswer) {
          onWrongAnswer();
          return;
        }
        selectTopic(topicId);
        return;
      }
      if (lockedTopicId) return;
      const weak = weakSpots(topics, state, 8);
      const nextWeak = weak.find((spot) => spot.topicId && spot.topicId !== topicId);
      selectTopic(nextWeak?.topicId || (profile?.subjectId === "physics" ? "phys-newton" : "inf-python"));
    },
    [fire, lockedTopicId, onWrongAnswer, profile?.subjectId, selectTopic, state, topicId, topics],
  );

  const onPlay = () => {
    if (startedRef.current) return;
    startedRef.current = true;
    fire("start");
  };

  const onEnded = () => {
    if (!completedRef.current) {
      completedRef.current = true;
      fire("complete");
    }
    setPhase("quiz");
  };

  if (topicHasLiveClip(topic) && topic?.liveClip) {
    return (
      <div className="flex flex-col items-center gap-5">
        <div className="w-full max-w-[390px]">
          <LiveClipPlayer
            script={topic.liveClip}
            topicId={topicId}
            clipId={`live-${topicId}`}
            onWrongAnswer={onWrongAnswer}
          />
        </div>
        <p className="text-xs text-pathwise-muted">{t("clips.sourceLine", { source: t("clips.source.live") })}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-5">
      {lockedTopicId ? null : (
      <div className="flex w-full max-w-3xl flex-col gap-3">
        {SUBJECTS.map((subject) => {
          const items = BASE_TOPICS.filter((item) => item.subjectId === subject.id);
          return (
            <div key={subject.id} className="flex flex-wrap items-center gap-2">
              <span className="mr-1 text-[11px] font-black uppercase tracking-[0.14em] text-pathwise-muted">
                {subject.title}
              </span>
              {items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => selectTopic(item.id)}
                  className={`min-h-11 rounded-full border px-3 text-sm font-bold ${
                    topicId === item.id
                      ? "border-[#6C63FF] bg-[#6C63FF] text-white"
                      : "border-slate-200 bg-white"
                  }`}
                >
                  {item.title}
                </button>
              ))}
            </div>
          );
        })}
        <button
          type="button"
          onClick={() => selectTopic(topicId, true)}
          className="min-h-11 w-fit rounded-full border border-slate-200 bg-white px-4 text-sm font-bold"
        >
          {t("clips.live")}
        </button>
      </div>
      )}

      <div className="w-full max-w-[390px] overflow-hidden rounded-[2.4rem] border-8 border-slate-900 bg-slate-950 shadow-2xl">
        <div className="relative aspect-[9/16] w-full bg-black text-white">
          {phase === "video" && videoSrc ? (
            <video
              key={videoSrc}
              src={videoSrc}
              className="h-full w-full object-cover"
              playsInline
              controls
              autoPlay
              onPlay={onPlay}
              onEnded={onEnded}
              onError={() => void loadFallback(topicId)}
            />
          ) : null}

          {phase === "quiz" && quiz ? (
            <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black via-black/80 to-transparent p-5">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#a99cff]">{t("clips.quizNow")}</p>
              <h2 className="mt-2 text-2xl font-black leading-tight">{catalogTopic?.title ?? topic?.title}</h2>
              <div className="mt-4 rounded-2xl bg-white p-4 text-slate-900">
                <p className="text-sm font-black">{quiz.prompt}</p>
                <AnswerField task={quiz} value={answer} onChange={setAnswer} />
                <button
                  type="button"
                  disabled={answer === "" || quizDone !== null}
                  onClick={() => {
                    const ok = isAnswerCorrect(quiz, answer);
                    setQuizDone(ok);
                    nextAfterQuiz(ok);
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
            </div>
          ) : null}

          {phase === "fallback" ? (
            <div className="flex h-full flex-col px-5 pb-8 pt-10">
              {!clip || !beat ? (
                <p className="text-white/80">{t("clips.loading")}</p>
              ) : (
                <>
                  <h2 className="text-2xl font-black leading-tight">{clip.title}</h2>
                  <p className="mt-6 text-lg font-semibold leading-8 text-white/95">{beat.text}</p>
                  {beat.kind === "check" && quiz ? (
                    <div className="mt-auto rounded-2xl bg-white p-4 text-slate-900">
                      <p className="text-sm font-black">{quiz.prompt}</p>
                      <AnswerField task={quiz} value={answer} onChange={setAnswer} />
                      <button
                        type="button"
                        disabled={answer === "" || quizDone !== null}
                        onClick={() => {
                          const ok = isAnswerCorrect(quiz, answer);
                          setQuizDone(ok);
                          nextAfterQuiz(ok);
                        }}
                        className="pw-btn-primary mt-3 w-full text-sm disabled:opacity-50"
                      >
                        {t("clips.answer")}
                      </button>
                    </div>
                  ) : (
                    <div className="mt-auto flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          fire("drop");
                          setBeatIndex(0);
                        }}
                        className="min-h-12 flex-1 rounded-full bg-white/10 text-sm font-bold"
                      >
                        {t("clips.restart")}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (beatIndex >= clip.beats.length - 1) fire("complete");
                          setBeatIndex((i) => Math.min(clip.beats.length - 1, i + 1));
                        }}
                        className="min-h-12 flex-[2] rounded-full bg-[#6C63FF] text-sm font-bold"
                      >
                        {t("clips.next")}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          ) : null}
        </div>
      </div>

      <p className="text-xs text-pathwise-muted">{t("clips.sourceLine", { source: t(`clips.source.${source}`) })}</p>
      {topicId && !lockedTopicId ? (
        <Link href={`/learning/topic/${topicId}`} className="text-sm font-bold text-[#554dd6]">
          {t("clips.openTopic")}
        </Link>
      ) : null}
      {loading ? <Pill tone="accent">{t("clips.building")}</Pill> : null}
      {!topic && phase !== "video" ? <ContentCard>{t("clips.loading")}</ContentCard> : null}
    </div>
  );
}
