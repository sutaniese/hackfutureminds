"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { AnimatedNumber } from "@/components/motion/AnimatedNumber";
import { ContentCard } from "@/components/ui/PageHero";
import { useAuth } from "@/components/shell/useAuth";
import { useUserProgress } from "@/components/gamification/UserProgressProvider";
import { useI18n } from "@/i18n/I18nProvider";
import { localizedCount, ofTasksI18n } from "@/lib/i18n-labels";
import { readJsonResponse } from "@/lib/http-json";
import { findSubject, subjectTitle, topicsForSubject } from "@/lib/learning/catalog";
import {
  isTopicComplete,
  learningSummary,
  nextTask,
  topicAccuracy,
  topicMastery,
  topicStateOf,
  weakSpots,
} from "@/lib/learning/recommend";
import { recordAttempt, upsertRosterEntry } from "@/lib/learning/store";
import { isAnswerCorrect, taskCorrectLabel } from "@/lib/learning/types";
import type { Task } from "@/lib/learning/types";
import { whyThisTask } from "@/lib/learning/why-this";
import { topicHasWatchableClip } from "@pathwise/shared";
import { AnswerField } from "./AnswerField";
import { ClipPlayer } from "./ClipPlayer";
import { ClipBadge, DifficultyBadge, EmptyState, Pill, ProgressBar, StatTile } from "./LearningUI";
import { SpeakButton } from "./SpeakButton";
import { TutorChat } from "./TutorChat";
import { useLearning } from "./useLearning";

type Tab = "theory" | "practice" | "tutor";

type Feedback = {
  correct: boolean;
  text: string;
  nextStep: string;
  source: "ai" | "local";
  correctAnswer: string;
};

const TABS: { id: Tab; labelKey: string }[] = [
  { id: "practice", labelKey: "topic.tab.practice" },
  { id: "theory", labelKey: "topic.tab.theory" },
  { id: "tutor", labelKey: "topic.tab.tutor" },
];

export function TopicPractice({ topicId }: { topicId: string }) {
  const { t, locale } = useI18n();
  const { profile, state, topics, ready } = useLearning();
  const { user } = useAuth();
  const { awardXp, earnBadge } = useUserProgress();

  const [tab, setTab] = useState<Tab>("practice");
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [checking, setChecking] = useState(false);
  const [showClip, setShowClip] = useState(false);

  const topic = useMemo(() => topics.find((item) => item.id === topicId) ?? null, [topicId, topics]);
  const subject = topic ? findSubject(topic.subjectId) : null;

  const mastery = topic ? topicMastery(topic, state) : 0;
  const accuracy = topic ? topicAccuracy(topic, state) : null;
  const topicState = topic ? topicStateOf(state, topic.id) : null;
  const task: Task | null = useMemo(
    () => (topic && !feedback ? nextTask(topic, state) : null),
    [feedback, state, topic],
  );
  const weak = useMemo(() => weakSpots(topics, state, 8), [state, topics]);

  const syncRoster = useCallback(() => {
    if (!user?.email || !profile || !topic) return;
    const summary = learningSummary(topics, profile, state);
    const weak = weakSpots(topics, state, 4);
    upsertRosterEntry({
      email: user.email,
      name: user.name,
      grade: profile.grade,
      subjectId: profile.subjectId,
      goals: profile.goals,
      level: state.diagnostic?.level ?? 1,
      mastery: summary.mastery,
      accuracy: summary.accuracy ?? 0,
      solvedTasks: summary.solvedTasks,
      weakTopics: Array.from(new Set(weak.map((spot) => spot.topicId).filter(Boolean))),
      updatedAt: Date.now(),
    });
  }, [profile, state, topic, topics, user?.email, user?.name]);

  const check = useCallback(
    async (current: Task) => {
      if (answer === "" || !topic) return;
      setChecking(true);

      const correct = isAnswerCorrect(current, answer);
      const givenLabel =
        current.type === "single" && current.options
          ? current.options[Number(answer)] ?? answer
          : answer;

      const nextState = recordAttempt({
        taskId: current.id,
        topicId: current.topicId,
        skill: current.skill,
        difficulty: current.difficulty,
        correct,
        answer: String(givenLabel),
      });

      if (correct) {
        awardXp(current.difficulty * 10, `learning_task_${current.id}`);

        if (isTopicComplete(topic, nextState)) earnBadge("topic_master");

        const solvedTotal = Object.values(nextState.topics).reduce(
          (sum, item) => sum + item.solved.length,
          0,
        );
        if (solvedTotal >= 10) earnBadge("task_marathon");

        // Навык считается закрытым, когда он ушёл из списка слабых мест.
        const wasWeak = weakSpots(topics, state, 20).some((spot) => spot.skill === current.skill);
        const stillWeak = weakSpots(topics, nextState, 20).some(
          (spot) => spot.skill === current.skill,
        );
        if (wasWeak && !stillWeak) earnBadge("gap_closed");
      }

      // Локальный разбор показываем сразу, AI-версию подставляем при успехе запроса.
      setFeedback({
        correct,
        text: current.explanation,
        nextStep: correct
          ? t("topic.nextLocalOk")
          : t("topic.nextLocalBad", { skill: current.skill }),
        source: "local",
        correctAnswer: taskCorrectLabel(current),
      });

      try {
        const response = await fetch("/api/learning/feedback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: current.prompt,
            passage: current.passage,
            options: current.options,
            studentAnswer: String(givenLabel),
            correctAnswer: taskCorrectLabel(current),
            isCorrect: correct,
            explanation: current.explanation,
            topicTitle: topic.title,
            subjectTitle: subjectTitle(topic.subjectId),
            skill: current.skill,
            grade: profile?.grade,
            difficulty: current.difficulty,
          }),
        });
        const data = (await readJsonResponse<{
          feedback: string;
          nextStep: string;
          source: "ai" | "local";
        }>(response)) as { feedback?: string; nextStep?: string; source?: "ai" | "local" };

        if (data.feedback) {
          setFeedback({
            correct,
            text: data.feedback,
            nextStep: data.nextStep ?? "",
            source: data.source ?? "local",
            correctAnswer: taskCorrectLabel(current),
          });
        }
      } catch {
        /* остаётся локальный разбор */
      } finally {
        setChecking(false);
        syncRoster();
      }
    },
    [answer, awardXp, earnBadge, profile?.grade, state, syncRoster, t, topic, topics],
  );

  const goNext = useCallback(() => {
    setFeedback(null);
    setAnswer("");
  }, []);

  if (!ready) {
    return <div className="pw-shimmer min-h-[24rem] rounded-[2rem] bg-white" aria-hidden />;
  }

  if (!topic) {
    return (
      <EmptyState
        title={t("topic.notFound")}
        description={t("topic.notFoundHint")}
        action={
          <Link href="/learning" className="pw-btn-primary text-sm">
            {t("topic.backDash")}
          </Link>
        }
      />
    );
  }

  const sameSubject = topicsForSubject(topics, topic.subjectId).filter((item) => item.id !== topic.id);
  const solvedCount = topicState?.solved.length ?? 0;
  const clipLocale = locale === "kk" ? "kk" : "ru";
  const hasClip = topicHasWatchableClip(topic, clipLocale);

  return (
    <div className="flex flex-col gap-5">
      <ContentCard>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Pill tone="accent">{subjectTitle(topic.subjectId)}</Pill>
              <Pill>{t("learn.grade", { n: topic.grades.join(", ") })}</Pill>
              {topic.custom ? <Pill tone="good">{t("topic.teacherAdded")}</Pill> : null}
              {hasClip ? <ClipBadge topicId={topicId} /> : null}
            </div>
            <h2 className="mt-3 flex flex-wrap items-center gap-3 text-2xl font-black tracking-tight text-pathwise-ink">
              {subject ? (
                <span
                  className="flex h-9 w-9 items-center justify-center rounded-xl text-base font-black text-white"
                  style={{ backgroundColor: subject.accent }}
                  aria-hidden
                >
                  {subject.mark}
                </span>
              ) : null}
              {topic.title}
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-pathwise-muted">{topic.summary}</p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            {hasClip ? (
              <button
                type="button"
                onClick={() => setShowClip((open) => !open)}
                className="pw-btn-primary text-sm"
              >
                {showClip ? t("topic.hideClip") : t("topic.watchClip")}
              </button>
            ) : null}
            <Link href="/learning" className="pw-btn-secondary text-sm">
              {t("topic.toDash")}
            </Link>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <StatTile
            label={t("learn.mastery")}
            value={<AnimatedNumber value={mastery} suffix="%" duration={700} />}
            hint={`${solvedCount} / ${ofTasksI18n(locale, topic.tasks.length)}`}
            tone="accent"
          />
          <StatTile
            label={t("topic.accuracy")}
            value={
              accuracy === null ? "—" : <AnimatedNumber value={accuracy} suffix="%" duration={700} />
            }
            hint={localizedCount(locale, "attempts", topicState?.attempts ?? 0)}
            tone={accuracy !== null && accuracy >= 70 ? "good" : "warn"}
          />
          <StatTile
            label={t("topic.diffNow")}
            value={t("topic.levelN", { n: topicState?.difficulty ?? 1 })}
            hint={t("topic.auto")}
          />
        </div>
        <div className="mt-5">
          <ProgressBar value={mastery} label={t("learn.masteredPct", { n: mastery })} />
        </div>

        <div className="mt-6 flex flex-wrap gap-2" role="tablist" aria-label={t("topic.tabs")}>
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={tab === item.id}
              onClick={() => setTab(item.id)}
              className={`min-h-12 rounded-full px-5 text-sm font-black transition ${
                tab === item.id
                  ? "bg-[#6C63FF] text-white shadow-sm"
                  : "border border-slate-200 bg-white text-pathwise-ink hover:border-[#6C63FF]/50"
              }`}
            >
              {t(item.labelKey)}
            </button>
          ))}
        </div>
      </ContentCard>

      {showClip && hasClip ? (
        <ContentCard>
          <ClipPlayer
            lockedTopicId={topicId}
            onWrongAnswer={() => {
              setShowClip(false);
              setTab("practice");
            }}
          />
        </ContentCard>
      ) : null}

      {tab === "practice" ? (
        <ContentCard>
          {feedback ? (
            <div className="pw-reveal">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p
                  className={`text-lg font-black ${
                    feedback.correct ? "text-emerald-700" : "text-[#c63d3d]"
                  }`}
                >
                  {feedback.correct ? t("topic.yes") : t("topic.no")}
                </p>
                <Pill tone={feedback.source === "ai" ? "accent" : "muted"}>
                  {feedback.source === "ai" ? t("topic.aiExplain") : t("topic.bankExplain")}
                </Pill>
              </div>

              <div
                className={`mt-4 rounded-2xl p-4 text-sm leading-7 ${
                  feedback.correct
                    ? "bg-emerald-500/10 text-emerald-900"
                    : "bg-[#FF6B6B]/10 text-[#7a2323]"
                }`}
              >
                {!feedback.correct ? (
                  <p className="mb-2 font-black">{t("topic.rightIs", { answer: feedback.correctAnswer })}</p>
                ) : null}
                <p>{feedback.text}</p>
              </div>

              {feedback.nextStep ? (
                <div className="mt-3 rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-700 ring-1 ring-slate-200">
                  <span className="font-black text-pathwise-ink">{t("topic.nextStep")}</span>
                  {feedback.nextStep}
                </div>
              ) : null}

              {checking ? (
                <p className="mt-3 text-xs font-semibold text-pathwise-muted">
                  {t("topic.fetching")}
                </p>
              ) : null}

              <div className="mt-6 flex flex-wrap gap-3">
                <button type="button" onClick={goNext} className="pw-btn-primary text-sm">
                  {t("topic.nextTask")}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTab("tutor");
                    setFeedback(null);
                    setAnswer("");
                  }}
                  className="pw-btn-secondary text-sm"
                >
                  {t("topic.askTutor")}
                </button>
              </div>
            </div>
          ) : task ? (
            <div key={task.id} className="pw-reveal">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-pathwise-accent-strong">
                  {t("topic.taskOf", { a: solvedCount + 1, b: topic.tasks.length })}
                </p>
                <DifficultyBadge difficulty={task.difficulty} />
              </div>

              {task.passage ? (
                <p className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-700 ring-1 ring-slate-200">
                  {task.passage}
                </p>
              ) : null}

              <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
                <p className="text-lg font-black leading-7 text-pathwise-ink">{task.prompt}</p>
                <SpeakButton
                  className="shrink-0"
                  label={t("topic.listenTask")}
                  text={[task.passage, task.prompt, ...(task.options ?? [])]
                    .filter(Boolean)
                    .join(". ")}
                />
              </div>
              <p className="mt-2 text-sm leading-6 text-pathwise-muted">
                {t("learn.why", { reason: whyThisTask(task, topic, weak, locale) })}
              </p>
              <AnswerField task={task} value={answer} onChange={setAnswer} />

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => void check(task)}
                  disabled={answer === "" || checking}
                  className="pw-btn-primary pw-press text-sm transition disabled:opacity-50"
                >
                  {checking ? t("topic.checking") : t("topic.check")}
                </button>
                <span className="text-xs font-semibold text-pathwise-muted">
                  {t("topic.skillMin", { skill: task.skill, n: task.minutes })}
                </span>
              </div>
            </div>
          ) : (
            <EmptyState
              title={t("topic.done")}
              description={t("topic.doneHint")}
              action={
                <Link href="/learning" className="pw-btn-primary text-sm">
                  {t("topic.toRecs")}
                </Link>
              }
            />
          )}
        </ContentCard>
      ) : null}

      {tab === "theory" ? (
        <div className="grid gap-5 lg:grid-cols-[1.3fr_0.7fr]">
          <ContentCard>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-lg font-black tracking-tight text-pathwise-ink">{t("topic.notes")}</h3>
              <SpeakButton label={t("topic.listenNotes")} text={topic.theory.join(" ")} />
            </div>
            <div className="mt-4 grid gap-3">
              {topic.theory.map((paragraph, index) => (
                <p
                  key={paragraph.slice(0, 40)}
                  className="rounded-2xl border border-slate-200 bg-white p-4 text-sm leading-7 text-slate-700"
                >
                  <span className="mr-2 font-black text-[#6C63FF]">{index + 1}.</span>
                  {paragraph}
                </p>
              ))}
            </div>

            <h4 className="mt-7 text-sm font-black uppercase tracking-[0.14em] text-pathwise-muted">
              {t("topic.skills")}
            </h4>
            <div className="mt-3 flex flex-wrap gap-2">
              {topic.skills.map((skill) => (
                <Pill key={skill} tone="accent">
                  {skill}
                </Pill>
              ))}
            </div>
          </ContentCard>

          <ContentCard>
            <h3 className="text-lg font-black tracking-tight text-pathwise-ink">{t("topic.materials")}</h3>
            <div className="mt-4 grid gap-3">
              {topic.materials.length === 0 ? (
                <p className="text-sm text-pathwise-muted">{t("topic.noMaterials")}</p>
              ) : (
                topic.materials.map((material) => (
                  <div key={material.title} className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <Pill tone="accent">{t(`material.${material.kind}`)}</Pill>
                      <span className="text-xs font-bold text-pathwise-muted">
                        {t("topic.min", { n: material.minutes })}
                      </span>
                    </div>
                    <p className="mt-3 text-sm font-black text-pathwise-ink">{material.title}</p>
                    <p className="mt-1 text-sm leading-6 text-pathwise-muted">{material.summary}</p>
                  </div>
                ))
              )}
            </div>
          </ContentCard>
        </div>
      ) : null}

      {tab === "tutor" ? (
        <ContentCard>
          <TutorChat topic={topic} grade={profile?.grade} />
        </ContentCard>
      ) : null}

      {sameSubject.length > 0 ? (
        <ContentCard>
          <h3 className="text-lg font-black tracking-tight text-pathwise-ink">
            {t("topic.other")}
          </h3>
          <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {sameSubject.slice(0, 6).map((item) => (
              <Link
                key={item.id}
                href={`/learning/topic/${item.id}`}
                className="rounded-2xl border border-slate-200 bg-white p-4 no-underline transition hover:-translate-y-0.5 hover:border-[#6C63FF]/50 hover:shadow-lg"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-black text-pathwise-ink">{item.title}</p>
                  <ClipBadge topicId={item.id} />
                </div>
                <p className="mt-1 line-clamp-2 text-xs leading-5 text-pathwise-muted">
                  {item.summary}
                </p>
                <div className="mt-3">
                  <ProgressBar value={topicMastery(item, state)} />
                </div>
              </Link>
            ))}
          </div>
        </ContentCard>
      ) : null}
    </div>
  );
}
