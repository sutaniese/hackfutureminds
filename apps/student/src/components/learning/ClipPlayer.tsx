"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/i18n/I18nProvider";
import { ContentCard } from "@/components/ui/PageHero";
import { SpeakButton } from "@/components/learning/SpeakButton";
import { AnswerField } from "@/components/learning/AnswerField";
import { Pill } from "@/components/learning/LearningUI";
import { BAKED_CLIPS, localClipForTopic } from "@/lib/learning/clips";
import type { LearningClip } from "@/lib/learning/clips/types";
import { findTask, findTopic } from "@/lib/learning/catalog";
import { isAnswerCorrect } from "@/lib/learning/types";
import { recordClipEvent } from "@/lib/learning/remote";
import { weakSpots } from "@/lib/learning/recommend";
import { useLearning } from "./useLearning";

const PRESET = [
  { topicId: "math-quadratic", labelKey: "clips.preset.quad" },
  { topicId: "phys-newton", labelKey: "clips.preset.newton" },
  { topicId: "inf-python", labelKey: "clips.preset.python" },
] as const;

export function ClipPlayer() {
  const { locale, t } = useI18n();
  const { topics, state, profile } = useLearning();
  const clipLocale = locale === "kk" ? "kk" : "ru";
  const [clip, setClip] = useState<LearningClip | null>(() =>
    BAKED_CLIPS.find((item) => item.topicId === "math-quadratic" && item.locale === "ru") ?? BAKED_CLIPS[0],
  );
  const [beatIndex, setBeatIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [quizDone, setQuizDone] = useState<null | boolean>(null);
  const [source, setSource] = useState<"baked" | "ai" | "local">("baked");
  const [loading, setLoading] = useState(false);

  const topic = clip ? findTopic(topics, clip.topicId) : null;
  const quiz = clip && topic ? findTask([topic], clip.quizTaskId) ?? topic.tasks[0] : null;
  const beat = clip?.beats[beatIndex];
  const progress = clip ? ((beatIndex + 1) / clip.beats.length) * 100 : 0;

  const clipId = clip?.id;
  const clipTopicId = clip?.topicId;
  useEffect(() => {
    if (!clipId || !clipTopicId) return;
    void recordClipEvent({ clipId, topicId: clipTopicId, event: "start" });
  }, [clipId, clipTopicId]);

  const loadTopic = useCallback(
    async (topicId: string, forceLive = false) => {
      setLoading(true);
      setBeatIndex(0);
      setAnswer("");
      setQuizDone(null);
      try {
        if (!forceLive) {
          const baked = BAKED_CLIPS.find(
            (item) => item.topicId === topicId && item.locale === clipLocale,
          ) ?? BAKED_CLIPS.find((item) => item.topicId === topicId);
          if (baked) {
            setClip(baked);
            setSource("baked");
            return;
          }
        }
        const response = await fetch("/api/clips/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ topicId, locale: clipLocale }),
        });
        const data = (await response.json()) as { clip?: LearningClip; source?: "ai" | "local" | "baked" };
        setClip(data.clip ?? localClipForTopic(topicId, clipLocale));
        setSource(data.source ?? "local");
      } finally {
        setLoading(false);
      }
    },
    [clipLocale],
  );

  const nextAfterQuiz = useCallback(
    (correct: boolean) => {
      if (!clip || !topic || !quiz) return;
      void recordClipEvent({
        clipId: clip.id,
        topicId: clip.topicId,
        event: correct ? "quiz_right" : "quiz_wrong",
      });
      const weak = weakSpots(topics, state, 8);
      if (!correct) {
        void loadTopic(clip.topicId);
        return;
      }
      const nextWeak = weak.find((spot) => spot.topicId && spot.topicId !== clip.topicId);
      void loadTopic(
        nextWeak?.topicId || (profile?.subjectId === "physics" ? "phys-newton" : "inf-python"),
      );
    },
    [clip, loadTopic, profile?.subjectId, quiz, state, topic, topics],
  );

  const caption = useMemo(() => beat?.text ?? "", [beat]);

  if (!clip || !beat) return <ContentCard>{t("clips.loading")}</ContentCard>;

  return (
    <div className="flex flex-col items-center gap-5">
      <div className="flex flex-wrap justify-center gap-2">
        {PRESET.map((item) => (
          <button
            key={item.topicId}
            type="button"
            onClick={() => void loadTopic(item.topicId)}
            className={`min-h-11 rounded-full border px-4 text-sm font-bold ${
              clip.topicId === item.topicId
                ? "border-[#6C63FF] bg-[#6C63FF] text-white"
                : "border-slate-200 bg-white"
            }`}
          >
            {t(item.labelKey)}
          </button>
        ))}
        <button
          type="button"
          onClick={() => void loadTopic(profile?.subjectId === "informatics" ? "inf-python" : "math-progression", true)}
          className="min-h-11 rounded-full border border-slate-200 bg-white px-4 text-sm font-bold"
        >
          {t("clips.live")}
        </button>
      </div>

      <div className="w-full max-w-[390px] overflow-hidden rounded-[2.4rem] border-8 border-slate-900 bg-slate-950 shadow-2xl">
        <div className="relative flex min-h-[640px] flex-col px-5 pb-8 pt-10 text-white">
          <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-white/20">
            <div className="h-full bg-[#6C63FF]" style={{ width: `${progress}%` }} />
          </div>
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#a99cff]">
            {t("clips.beatLine", {
              label: t(`clip.beat.${beat.kind}`),
              a: beatIndex + 1,
              b: clip.beats.length,
            })}
          </p>
          <h2 className="mt-3 text-2xl font-black leading-tight">{clip.title}</h2>
          <p className="mt-6 text-lg font-semibold leading-8 text-white/95">{caption}</p>
          <div className="mt-6">
            <SpeakButton text={caption} label={t("clips.listen")} />
          </div>

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
              {quizDone !== null ? (
                <p className={`mt-2 text-sm font-bold ${quizDone ? "text-emerald-600" : "text-[#E75555]"}`}>
                  {quizDone ? t("clips.ok") : t("clips.bad")}
                </p>
              ) : null}
            </div>
          ) : (
            <div className="mt-auto flex gap-2">
              <button
                type="button"
                onClick={() => {
                  void recordClipEvent({ clipId: clip.id, topicId: clip.topicId, event: "drop" });
                  setBeatIndex(0);
                }}
                className="min-h-12 flex-1 rounded-full bg-white/10 text-sm font-bold"
              >
                {t("clips.restart")}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (beatIndex >= clip.beats.length - 1) {
                    void recordClipEvent({ clipId: clip.id, topicId: clip.topicId, event: "complete" });
                  }
                  setBeatIndex((i) => Math.min(clip.beats.length - 1, i + 1));
                }}
                className="min-h-12 flex-[2] rounded-full bg-[#6C63FF] text-sm font-bold"
              >
                {t("clips.next")}
              </button>
            </div>
          )}
        </div>
      </div>

      <p className="text-xs text-pathwise-muted">
        {t("clips.sourceLine", { source: t(`clips.source.${source}`) })}
      </p>
      {clip.topicId ? (
        <Link href={`/learning/topic/${clip.topicId}`} className="text-sm font-bold text-[#554dd6]">
          {t("clips.openTopic")}
        </Link>
      ) : null}
      {loading ? <Pill tone="accent">{t("clips.building")}</Pill> : null}
    </div>
  );
}
