"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { ContentCard } from "@/components/ui/PageHero";
import { useAuth } from "@/components/shell/useAuth";
import { useUserProgress } from "@/components/gamification/UserProgressProvider";
import { readJsonResponse } from "@/lib/http-json";
import { findSubject, subjectTitle, topicsForSubject } from "@/lib/learning/catalog";
import {
  learningSummary,
  nextTask,
  topicAccuracy,
  topicMastery,
  topicStateOf,
  weakSpots,
} from "@/lib/learning/recommend";
import { recordAttempt, upsertRosterEntry } from "@/lib/learning/store";
import { attemptsLabel, tasksLabel } from "@/lib/learning/plural";
import { MATERIAL_KIND_LABELS, isAnswerCorrect, taskCorrectLabel } from "@/lib/learning/types";
import type { Task } from "@/lib/learning/types";
import { AnswerField } from "./AnswerField";
import { DifficultyBadge, EmptyState, Pill, ProgressBar, StatTile } from "./LearningUI";
import { TutorChat } from "./TutorChat";
import { useLearning } from "./useLearning";

type Tab = "theory" | "practice" | "tutor";

type Feedback = {
  correct: boolean;
  text: string;
  nextStep: string;
  source: "groq" | "local";
  correctAnswer: string;
};

const TABS: { id: Tab; label: string }[] = [
  { id: "practice", label: "Задания" },
  { id: "theory", label: "Конспект" },
  { id: "tutor", label: "AI-репетитор" },
];

export function TopicPractice({ topicId }: { topicId: string }) {
  const { profile, state, topics, ready } = useLearning();
  const { user } = useAuth();
  const { awardXp } = useUserProgress();

  const [tab, setTab] = useState<Tab>("practice");
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [checking, setChecking] = useState(false);

  const topic = useMemo(() => topics.find((item) => item.id === topicId) ?? null, [topicId, topics]);
  const subject = topic ? findSubject(topic.subjectId) : null;

  const mastery = topic ? topicMastery(topic, state) : 0;
  const accuracy = topic ? topicAccuracy(topic, state) : null;
  const topicState = topic ? topicStateOf(state, topic.id) : null;
  const task: Task | null = useMemo(
    () => (topic && !feedback ? nextTask(topic, state) : null),
    [feedback, state, topic],
  );

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

      recordAttempt({
        taskId: current.id,
        topicId: current.topicId,
        skill: current.skill,
        difficulty: current.difficulty,
        correct,
        answer: String(givenLabel),
      });

      if (correct) {
        awardXp(current.difficulty * 10, `learning_task_${current.id}`);
      }

      // Локальный разбор показываем сразу, AI-версию подставляем при успехе запроса.
      setFeedback({
        correct,
        text: current.explanation,
        nextStep: correct
          ? "Следующее задание подстроится под твой уровень."
          : `Повтори навык «${current.skill}» в конспекте темы.`,
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
          source: "groq" | "local";
        }>(response)) as { feedback?: string; nextStep?: string; source?: "groq" | "local" };

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
    [answer, awardXp, profile?.grade, syncRoster, topic],
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
        title="Тема не найдена"
        description="Возможно, тема была удалена из конструктора учителя или ссылка устарела."
        action={
          <Link href="/learning" className="pw-btn-primary text-sm">
            Вернуться в кабинет
          </Link>
        }
      />
    );
  }

  const sameSubject = topicsForSubject(topics, topic.subjectId).filter((item) => item.id !== topic.id);
  const solvedCount = topicState?.solved.length ?? 0;

  return (
    <div className="flex flex-col gap-5">
      <ContentCard>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Pill tone="accent">{subjectTitle(topic.subjectId)}</Pill>
              <Pill>{topic.grades.join(", ")} класс</Pill>
              {topic.custom ? <Pill tone="good">Добавлено учителем</Pill> : null}
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
          <Link href="/learning" className="pw-btn-secondary shrink-0 text-sm">
            В кабинет
          </Link>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <StatTile
            label="Освоено"
            value={`${mastery}%`}
            hint={`${solvedCount} из ${tasksLabel(topic.tasks.length)}`}
            tone="accent"
          />
          <StatTile
            label="Точность по теме"
            value={accuracy === null ? "—" : `${accuracy}%`}
            hint={attemptsLabel(topicState?.attempts ?? 0)}
            tone={accuracy !== null && accuracy >= 70 ? "good" : "warn"}
          />
          <StatTile
            label="Текущая сложность"
            value={`Уровень ${topicState?.difficulty ?? 1}`}
            hint="подстраивается автоматически"
          />
        </div>
        <div className="mt-5">
          <ProgressBar value={mastery} label={`Освоено ${mastery}%`} />
        </div>

        <div className="mt-6 flex flex-wrap gap-2" role="tablist" aria-label="Разделы темы">
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
              {item.label}
            </button>
          ))}
        </div>
      </ContentCard>

      {tab === "practice" ? (
        <ContentCard>
          {feedback ? (
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p
                  className={`text-lg font-black ${
                    feedback.correct ? "text-emerald-700" : "text-[#c63d3d]"
                  }`}
                >
                  {feedback.correct ? "Верно" : "Пока неверно"}
                </p>
                <Pill tone={feedback.source === "groq" ? "accent" : "muted"}>
                  {feedback.source === "groq" ? "Разбор от AI" : "Разбор из базы"}
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
                  <p className="mb-2 font-black">Правильный ответ: {feedback.correctAnswer}</p>
                ) : null}
                <p>{feedback.text}</p>
              </div>

              {feedback.nextStep ? (
                <div className="mt-3 rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-700 ring-1 ring-slate-200">
                  <span className="font-black text-pathwise-ink">Следующий шаг: </span>
                  {feedback.nextStep}
                </div>
              ) : null}

              {checking ? (
                <p className="mt-3 text-xs font-semibold text-pathwise-muted">
                  Запрашиваем персональный разбор…
                </p>
              ) : null}

              <div className="mt-6 flex flex-wrap gap-3">
                <button type="button" onClick={goNext} className="pw-btn-primary text-sm">
                  Следующее задание
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
                  Спросить репетитора
                </button>
              </div>
            </div>
          ) : task ? (
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-pathwise-accent-strong">
                  Задание {solvedCount + 1} из {topic.tasks.length}
                </p>
                <DifficultyBadge difficulty={task.difficulty} />
              </div>

              {task.passage ? (
                <p className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-700 ring-1 ring-slate-200">
                  {task.passage}
                </p>
              ) : null}

              <p className="mt-4 text-lg font-black leading-7 text-pathwise-ink">{task.prompt}</p>
              <AnswerField task={task} value={answer} onChange={setAnswer} />

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => void check(task)}
                  disabled={answer === "" || checking}
                  className="pw-btn-primary text-sm disabled:opacity-50"
                >
                  {checking ? "Проверяем…" : "Проверить ответ"}
                </button>
                <span className="text-xs font-semibold text-pathwise-muted">
                  Навык: {task.skill} · ~{task.minutes} мин
                </span>
              </div>
            </div>
          ) : (
            <EmptyState
              title="Тема пройдена полностью"
              description="Все задания решены верно. Возьми следующую рекомендованную тему или вернись сюда позже для повторения."
              action={
                <Link href="/learning" className="pw-btn-primary text-sm">
                  К рекомендациям
                </Link>
              }
            />
          )}
        </ContentCard>
      ) : null}

      {tab === "theory" ? (
        <div className="grid gap-5 lg:grid-cols-[1.3fr_0.7fr]">
          <ContentCard>
            <h3 className="text-lg font-black tracking-tight text-pathwise-ink">Конспект темы</h3>
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
              Навыки темы
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
            <h3 className="text-lg font-black tracking-tight text-pathwise-ink">Материалы</h3>
            <div className="mt-4 grid gap-3">
              {topic.materials.length === 0 ? (
                <p className="text-sm text-pathwise-muted">Материалы к теме пока не добавлены.</p>
              ) : (
                topic.materials.map((material) => (
                  <div key={material.title} className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <Pill tone="accent">{MATERIAL_KIND_LABELS[material.kind]}</Pill>
                      <span className="text-xs font-bold text-pathwise-muted">
                        {material.minutes} мин
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
            Другие темы предмета
          </h3>
          <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {sameSubject.slice(0, 6).map((item) => (
              <Link
                key={item.id}
                href={`/learning/topic/${item.id}`}
                className="rounded-2xl border border-slate-200 bg-white p-4 no-underline transition hover:-translate-y-0.5 hover:border-[#6C63FF]/50 hover:shadow-lg"
              >
                <p className="text-sm font-black text-pathwise-ink">{item.title}</p>
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
