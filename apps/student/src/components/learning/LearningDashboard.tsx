"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ContentCard } from "@/components/ui/PageHero";
import { readJsonResponse } from "@/lib/http-json";
import { findSubject, subjectTitle } from "@/lib/learning/catalog";
import {
  buildStudyPlan,
  daysUntil,
  learningSummary,
  priorityLabel,
  recommendTopics,
  topicMastery,
  topicStateOf,
  weakSpots,
} from "@/lib/learning/recommend";
import { LEVEL_LABELS } from "@/lib/learning/store";
import { attemptsLabel, daysLabel, tasksLabel } from "@/lib/learning/plural";
import { LEARNING_GOALS } from "@/lib/learning/types";
import { EmptyState, Pill, ProgressBar, StatTile } from "./LearningUI";
import { useLearning } from "./useLearning";

type PlanWeek = { index: number; title: string; goals: string[] };
type PlanPayload = { headline: string; focus: string[]; weeks: PlanWeek[]; source: "groq" | "local" };

function goalTitle(goalId: string): string {
  return LEARNING_GOALS.find((goal) => goal.id === goalId)?.title ?? goalId;
}

function deadlineTone(days: number | null): "good" | "accent" | "warn" {
  if (days === null) return "accent";
  if (days <= 14) return "warn";
  if (days <= 45) return "accent";
  return "good";
}

export function LearningDashboard() {
  const { profile, state, topics, ready } = useLearning();
  const [plan, setPlan] = useState<PlanPayload | null>(null);
  const [planLoading, setPlanLoading] = useState(false);
  const [planError, setPlanError] = useState<string | null>(null);

  const summary = useMemo(
    () => learningSummary(topics, profile, state),
    [profile, state, topics],
  );
  const recommendations = useMemo(
    () => recommendTopics(topics, profile, state, 5),
    [profile, state, topics],
  );
  const weak = useMemo(() => weakSpots(topics, state, 5), [state, topics]);
  const localPlan = useMemo(() => buildStudyPlan(topics, profile, state), [profile, state, topics]);
  const days = useMemo(() => daysUntil(profile?.examDate), [profile?.examDate]);
  const subject = profile ? findSubject(profile.subjectId) : null;

  const requestPlan = useCallback(async () => {
    if (!profile || !localPlan) return;
    setPlanLoading(true);
    setPlanError(null);
    try {
      const response = await fetch("/api/learning/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          grade: profile.grade,
          subjectTitle: subjectTitle(profile.subjectId),
          goals: profile.goals.map(goalTitle),
          examDate: profile.examDate,
          daysLeft: days,
          minutesPerDay: profile.minutesPerDay,
          level: state.diagnostic?.level,
          levelLabel: state.diagnostic ? LEVEL_LABELS[state.diagnostic.level] : undefined,
          weakSpots: weak.map((spot) => spot.skill),
          basePlan: {
            headline: localPlan.headline,
            weeks: localPlan.weeks.map((week) => ({
              index: week.index,
              title: week.title,
              goals: week.goals,
            })),
          },
        }),
      });
      const data = (await readJsonResponse<PlanPayload>(response)) as PlanPayload & { error?: string };
      if (data.error) throw new Error(data.error);
      setPlan(data);
    } catch (error) {
      setPlanError(error instanceof Error ? error.message : "Не удалось собрать план");
      setPlan({
        headline: localPlan.headline,
        focus: weak.map((spot) => `Закрыть пробел: ${spot.skill}`),
        weeks: localPlan.weeks,
        source: "local",
      });
    } finally {
      setPlanLoading(false);
    }
  }, [days, localPlan, profile, state.diagnostic, weak]);

  // План собирается автоматически при первом заходе с готовым профилем.
  useEffect(() => {
    if (!ready || !profile || !localPlan || plan || planLoading) return;
    void requestPlan();
  }, [localPlan, plan, planLoading, profile, ready, requestPlan]);

  if (!ready) {
    return <div className="pw-shimmer min-h-[24rem] rounded-[2rem] bg-white" aria-hidden />;
  }

  if (!profile) {
    return (
      <EmptyState
        title="Личный кабинет появится после диагностики"
        description="Укажи класс, предмет и цель, пройди 8 коротких вопросов — и система соберёт персональный план, рекомендации и список слабых мест."
        action={
          <Link href="/learning/diagnostics" className="pw-btn-primary text-sm">
            Пройти диагностику
          </Link>
        }
      />
    );
  }

  const activePlan = plan ?? (localPlan
    ? { headline: localPlan.headline, focus: [], weeks: localPlan.weeks, source: "local" as const }
    : null);

  return (
    <div className="flex flex-col gap-5">
      <ContentCard>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-pathwise-accent-strong">
              Профиль ученика
            </p>
            <h2 className="mt-2 flex flex-wrap items-center gap-3 text-2xl font-black tracking-tight text-pathwise-ink">
              {subject ? (
                <span
                  className="flex h-9 w-9 items-center justify-center rounded-xl text-base font-black text-white"
                  style={{ backgroundColor: subject.accent }}
                  aria-hidden
                >
                  {subject.mark}
                </span>
              ) : null}
              {subjectTitle(profile.subjectId)} · {profile.grade} класс
            </h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {profile.goals.map((goal) => (
                <Pill key={goal} tone="accent">
                  {goalTitle(goal)}
                </Pill>
              ))}
              <Pill>{profile.minutesPerDay} мин в день</Pill>
              {state.diagnostic ? (
                <Pill tone="good">Уровень: {LEVEL_LABELS[state.diagnostic.level]}</Pill>
              ) : null}
            </div>
          </div>
          <Link href="/learning/diagnostics" className="pw-btn-secondary shrink-0 text-sm">
            Изменить профиль
          </Link>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile
            label="Освоено"
            value={`${summary.mastery}%`}
            hint={`${summary.solvedTasks} из ${tasksLabel(summary.totalTasks)}`}
            tone="accent"
          />
          <StatTile
            label="Точность"
            value={summary.accuracy === null ? "—" : `${summary.accuracy}%`}
            hint={attemptsLabel(summary.attempts)}
            tone={summary.accuracy !== null && summary.accuracy >= 70 ? "good" : "warn"}
          />
          <StatTile
            label="Темы в работе"
            value={String(summary.activeTopics)}
            hint={`завершено ${summary.completedTopics}`}
          />
          <StatTile
            label={profile.examDate ? "До цели" : "Дедлайн"}
            value={days !== null && days >= 0 ? daysLabel(days) : profile.examDate ? "прошёл" : "не задан"}
            hint={profile.examDate || "укажите дату в профиле"}
            tone={deadlineTone(days)}
          />
        </div>

        <div className="mt-5">
          <ProgressBar value={summary.mastery} label={`Освоено ${summary.mastery}%`} />
        </div>
      </ContentCard>

      <section className="grid gap-5 xl:grid-cols-[1.35fr_0.65fr]">
        <ContentCard>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-black tracking-tight text-pathwise-ink">
                Рекомендованные темы
              </h3>
              <p className="mt-1 text-sm text-pathwise-muted">
                Подобраны по результатам диагностики, классу и цели обучения.
              </p>
            </div>
            <Pill tone="accent">AI-персонализация</Pill>
          </div>

          {recommendations.length === 0 ? (
            <p className="mt-5 text-sm text-pathwise-muted">
              По этому предмету пока нет тем. Попросите учителя добавить материал через панель.
            </p>
          ) : (
            <div className="mt-5 grid gap-3">
              {recommendations.map((item) => {
                const mastery = topicMastery(item.topic, state);
                const topicState = topicStateOf(state, item.topic.id);
                return (
                  <Link
                    key={item.topic.id}
                    href={`/learning/topic/${item.topic.id}`}
                    className="group rounded-2xl border border-slate-200 bg-white p-4 no-underline transition hover:-translate-y-0.5 hover:border-[#6C63FF]/50 hover:shadow-lg"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-base font-black text-pathwise-ink">{item.topic.title}</p>
                      <Pill tone={item.priority === "high" ? "warn" : item.priority === "medium" ? "accent" : "muted"}>
                        {priorityLabel(item.priority)}
                      </Pill>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-pathwise-muted">
                      Почему сейчас: {item.reason}.
                    </p>
                    <div className="mt-3">
                      <ProgressBar value={mastery} />
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-semibold text-pathwise-muted">
                      <span>{tasksLabel(item.topic.tasks.length)}</span>
                      <span aria-hidden>·</span>
                      <span>освоено {mastery}%</span>
                      <span aria-hidden>·</span>
                      <span>текущий уровень {topicState.difficulty}</span>
                      {item.topic.custom ? (
                        <>
                          <span aria-hidden>·</span>
                          <span className="text-[#554dd6]">добавлено учителем</span>
                        </>
                      ) : null}
                    </div>
                    <span className="mt-4 inline-flex text-sm font-black text-[#6C63FF]">
                      Перейти к теме →
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </ContentCard>

        <div className="grid content-start gap-5">
          <ContentCard>
            <h3 className="text-lg font-black tracking-tight text-pathwise-ink">Слабые места</h3>
            <p className="mt-1 text-sm text-pathwise-muted">
              Навыки с точностью ниже 70% — по диагностике и решённым заданиям.
            </p>
            {weak.length === 0 ? (
              <p className="mt-4 rounded-2xl bg-emerald-500/10 p-4 text-sm font-semibold leading-6 text-emerald-800">
                Пока слабых мест не выявлено. Решай задания дальше — система следит за точностью
                по каждому навыку.
              </p>
            ) : (
              <div className="mt-4 grid gap-2.5">
                {weak.map((spot) => (
                  <div key={spot.skill} className="rounded-2xl border border-slate-200 bg-white p-3.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-black text-pathwise-ink">{spot.skill}</p>
                      <Pill tone="warn">{spot.accuracy}%</Pill>
                    </div>
                    {spot.topicTitle ? (
                      <p className="mt-1 text-xs font-semibold text-pathwise-muted">{spot.topicTitle}</p>
                    ) : null}
                    <div className="mt-2.5">
                      <ProgressBar value={spot.accuracy} color="#FF6B6B" />
                    </div>
                    {spot.topicId ? (
                      <Link
                        href={`/learning/topic/${spot.topicId}`}
                        className="mt-3 inline-flex text-xs font-black text-[#6C63FF]"
                      >
                        Отработать →
                      </Link>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </ContentCard>

          <ContentCard>
            <h3 className="text-lg font-black tracking-tight text-pathwise-ink">Ближайшие цели</h3>
            <div className="mt-4 grid gap-2.5">
              {profile.examDate ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-3.5">
                  <p className="text-sm font-black text-pathwise-ink">
                    {profile.goals.map(goalTitle).join(", ") || "Учебная цель"}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-pathwise-muted">
                    Дата: {profile.examDate}
                  </p>
                  <p className="mt-2 text-sm font-black text-[#6C63FF]">
                    {days !== null && days >= 0 ? `Осталось ${daysLabel(days)}` : "Дата уже прошла"}
                  </p>
                </div>
              ) : (
                <p className="text-sm leading-6 text-pathwise-muted">
                  Дата цели не указана. Добавь её в профиле — план перестроится под оставшееся
                  время, а напоминания станут точнее.
                </p>
              )}
              {recommendations.slice(0, 2).map((item) => (
                <div key={item.topic.id} className="rounded-2xl bg-slate-50 p-3.5 ring-1 ring-slate-200">
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-pathwise-muted">
                    Следующий шаг
                  </p>
                  <p className="mt-1 text-sm font-bold leading-6 text-pathwise-ink">
                    {item.topic.title}: решить{" "}
                    {tasksLabel(
                      item.topic.tasks.length - topicStateOf(state, item.topic.id).solved.length,
                    )}
                  </p>
                </div>
              ))}
            </div>
          </ContentCard>
        </div>
      </section>

      <ContentCard>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-black tracking-tight text-pathwise-ink">План подготовки</h3>
            <p className="mt-1 text-sm text-pathwise-muted">
              {activePlan?.headline ?? "План соберётся после диагностики."}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {activePlan ? (
              <Pill tone={activePlan.source === "groq" ? "accent" : "muted"}>
                {activePlan.source === "groq" ? "Составлен AI" : "Локальный расчёт"}
              </Pill>
            ) : null}
            <button
              type="button"
              onClick={() => void requestPlan()}
              disabled={planLoading || !localPlan}
              className="pw-btn-secondary text-sm disabled:opacity-50"
            >
              {planLoading ? "Собираем…" : "Пересобрать план"}
            </button>
          </div>
        </div>

        {planError ? (
          <p className="mt-3 text-xs font-semibold text-[#c63d3d]">
            AI недоступен ({planError}) — показан план, рассчитанный локально.
          </p>
        ) : null}

        {activePlan && activePlan.focus.length > 0 ? (
          <div className="mt-5 flex flex-wrap gap-2">
            {activePlan.focus.map((item) => (
              <Pill key={item} tone="accent">
                {item}
              </Pill>
            ))}
          </div>
        ) : null}

        {activePlan && activePlan.weeks.length > 0 ? (
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {activePlan.weeks.map((week) => (
              <div key={week.index} className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-pathwise-accent-strong">
                  Неделя {week.index}
                </p>
                <p className="mt-2 text-sm font-black leading-6 text-pathwise-ink">{week.title}</p>
                <ul className="mt-3 grid gap-2">
                  {week.goals.map((goal) => (
                    <li key={goal} className="flex gap-2 text-sm leading-6 text-pathwise-muted">
                      <span aria-hidden className="text-[#6C63FF]">
                        •
                      </span>
                      <span>{goal}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-5 text-sm text-pathwise-muted">
            План появится, как только по предмету будут доступны темы.
          </p>
        )}
      </ContentCard>

      {state.attempts.length > 0 ? (
        <ContentCard>
          <h3 className="text-lg font-black tracking-tight text-pathwise-ink">Последняя активность</h3>
          <div className="mt-4 grid gap-2">
            {state.attempts.slice(0, 6).map((attempt) => {
              const topic = topics.find((item) => item.id === attempt.topicId);
              return (
                <div
                  key={`${attempt.taskId}-${attempt.at}`}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-pathwise-ink">
                      {topic?.title ?? attempt.topicId}
                    </p>
                    <p className="text-xs font-semibold text-pathwise-muted">
                      {attempt.skill} · уровень {attempt.difficulty}
                    </p>
                  </div>
                  <Pill tone={attempt.correct ? "good" : "warn"}>
                    {attempt.correct ? "верно" : "ошибка"}
                  </Pill>
                </div>
              );
            })}
          </div>
        </ContentCard>
      ) : null}
    </div>
  );
}
