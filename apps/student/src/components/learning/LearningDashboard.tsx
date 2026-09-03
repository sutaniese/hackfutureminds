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
  recommendTopics,
  reviewQueue,
  topicMastery,
  topicStateOf,
  weakSpots,
} from "@/lib/learning/recommend";
import { LEVEL_LABELS } from "@/lib/learning/store";
import { LEARNING_GOALS } from "@/lib/learning/types";
import { AnimatedNumber } from "@/components/motion/AnimatedNumber";
import { ProgressRing } from "@/components/motion/ProgressRing";
import { ClipBadge, EmptyState, Pill, ProgressBar, StatTile } from "./LearningUI";
import { ReminderBanner } from "./ReminderBanner";
import { ClassJoinCard } from "./ClassJoinCard";
import { useLearning } from "./useLearning";
import { whyThisTopic } from "@/lib/learning/why-this";
import { useI18n } from "@/i18n/I18nProvider";
import { goalLabel, localizedCount, ofTasksI18n } from "@/lib/i18n-labels";

type PlanWeek = { index: number; title: string; goals: string[] };
type PlanPayload = { headline: string; focus: string[]; weeks: PlanWeek[]; source: "ai" | "local" };

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
  const { t, locale } = useI18n();
  const { profile, state, topics, ready, inviteCode } = useLearning();
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
  const reviews = useMemo(() => reviewQueue(topics, profile, state), [profile, state, topics]);
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
      setPlanError(error instanceof Error ? error.message : t("learn.planFail"));
      setPlan({
        headline: localPlan.headline,
        focus: weak.map((spot) => t("learn.closeGap", { skill: spot.skill })),
        weeks: localPlan.weeks,
        source: "local",
      });
    } finally {
      setPlanLoading(false);
    }
  }, [days, localPlan, profile, state.diagnostic, t, weak]);

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
      <div className="flex flex-col gap-5">
        <ClassJoinCard currentCode={inviteCode} compact />
        <EmptyState
          title={t("learn.empty.title")}
          description={t("learn.empty.body")}
          action={
            <Link href="/learning/diagnostics" className="pw-btn-primary text-sm">
              {t("learn.takeDiag")}
            </Link>
          }
        />
      </div>
    );
  }

  const activePlan = plan ?? (localPlan
    ? { headline: localPlan.headline, focus: [], weeks: localPlan.weeks, source: "local" as const }
    : null);

  return (
    <div className="flex flex-col gap-5">
      <ReminderBanner days={days} reviews={reviews} />
      <ClassJoinCard currentCode={inviteCode} compact />
      <div className="flex flex-wrap gap-3">
        <Link href="/learning/class" className="pw-btn-secondary text-sm no-underline">
          {t("learn.classLink")}
        </Link>
        <Link href="/learning/clips" className="pw-btn-primary text-sm no-underline">
          {t("learn.clips")}
        </Link>
        <Link href="/learning/diagnostics" className="pw-btn-secondary text-sm no-underline">
          {t("learn.diag")}
        </Link>
      </div>

      <ContentCard className="overflow-hidden">
        <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="min-w-0">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-pathwise-accent-strong">
                  {t("learn.profile")}
                </p>
                <h2 className="mt-2 flex flex-wrap items-center gap-3 text-2xl font-black tracking-tight text-pathwise-ink">
                  {subject ? (
                    <span
                      className="flex h-10 w-10 items-center justify-center rounded-2xl text-lg font-black text-white shadow-sm transition duration-300 hover:scale-105"
                      style={{ backgroundColor: subject.accent }}
                      aria-hidden
                    >
                      {subject.mark}
                    </span>
                  ) : null}
                  {subjectTitle(profile.subjectId)} · {t("learn.grade", { n: profile.grade })}
                </h2>
                <div className="mt-3 flex flex-wrap gap-2">
                  {profile.goals.map((goal) => (
                    <Pill key={goal} tone="accent">
                      {goalLabel(t, goal)}
                    </Pill>
                  ))}
                  <Pill>{t("plural.min", { n: profile.minutesPerDay })}</Pill>
                  {state.diagnostic ? (
                    <Pill tone="good">{t("learn.levelPill", { label: t(`level.${state.diagnostic.level}`) })}</Pill>
                  ) : null}
                </div>
              </div>
              <Link
                href="/learning/diagnostics"
                className="pw-btn-secondary pw-press shrink-0 text-sm"
              >
                {t("learn.editProfile")}
              </Link>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <StatTile
                label={t("learn.accuracy")}
                delay={60}
                value={
                  summary.accuracy === null ? (
                    "—"
                  ) : (
                    <AnimatedNumber value={summary.accuracy} suffix="%" delay={200} />
                  )
                }
                hint={localizedCount(locale, "attempts", summary.attempts)}
                tone={summary.accuracy !== null && summary.accuracy >= 70 ? "good" : "warn"}
              />
              <StatTile
                label={t("learn.activeTopics")}
                delay={120}
                value={<AnimatedNumber value={summary.activeTopics} delay={260} />}
                hint={t("learn.completedHint", { n: summary.completedTopics })}
              />
              <StatTile
                label={profile.examDate ? t("learn.untilGoal") : t("learn.deadline")}
                delay={180}
                value={
                  days !== null && days >= 0
                    ? localizedCount(locale, "days", days)
                    : profile.examDate
                      ? t("learn.passed")
                      : t("learn.notSet")
                }
                hint={profile.examDate || t("learn.examHint")}
                tone={deadlineTone(days)}
              />
            </div>
          </div>

          <div className="pw-reveal flex justify-center lg:pl-4" style={{ "--d": "220ms" } as React.CSSProperties}>
            <ProgressRing
              value={summary.mastery}
              label={t("learn.mastery")}
              caption={`${summary.solvedTasks} / ${ofTasksI18n(locale, summary.totalTasks)}`}
            />
          </div>
        </div>
      </ContentCard>

      <section className="grid items-start gap-5 xl:grid-cols-[1.35fr_0.65fr]">
        <ContentCard>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-black tracking-tight text-pathwise-ink">
                {t("learn.recs")}
              </h3>
              <p className="mt-1 text-sm text-pathwise-muted">
                {t("learn.recsHint")}
              </p>
            </div>
            <Pill tone="accent">{t("learn.ai")}</Pill>
          </div>

          {recommendations.length === 0 ? (
            <p className="mt-5 text-sm text-pathwise-muted">
              {t("learn.noTopics")}
            </p>
          ) : (
            <div className="mt-5 grid gap-3">
              {recommendations.map((item, index) => {
                const mastery = topicMastery(item.topic, state);
                const topicState = topicStateOf(state, item.topic.id);
                return (
                  <Link
                    key={item.topic.id}
                    href={`/learning/topic/${item.topic.id}`}
                    style={{ "--d": `${index * 90}ms` } as React.CSSProperties}
                    className="pw-reveal pw-press group block rounded-2xl border border-slate-200 bg-white p-4 no-underline hover:-translate-y-1 hover:border-[#6C63FF]/50 hover:shadow-[0_18px_40px_rgb(108_99_255_/_0.15)]"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex min-w-0 flex-wrap items-center gap-2">
                        <p className="text-base font-black text-pathwise-ink transition-colors duration-200 group-hover:text-[#554dd6]">
                          {item.topic.title}
                        </p>
                        <ClipBadge topicId={item.topic.id} />
                      </div>
                      <Pill tone={item.priority === "high" ? "warn" : item.priority === "medium" ? "accent" : "muted"}>
                        {t(`priority.${item.priority}`)}
                      </Pill>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-pathwise-muted">
                      {t("learn.why", { reason: whyThisTopic(item, weak, locale) })}
                    </p>
                    <div className="mt-3">
                      <ProgressBar value={mastery} delay={index * 90 + 200} />
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-semibold text-pathwise-muted">
                      <span>{localizedCount(locale, "tasks", item.topic.tasks.length)}</span>
                      <span aria-hidden>·</span>
                      <span>{t("learn.masteredPct", { n: mastery })}</span>
                      <span aria-hidden>·</span>
                      <span>{t("learn.currentLevel", { n: topicState.difficulty })}</span>
                      {item.topic.custom ? (
                        <>
                          <span aria-hidden>·</span>
                          <span className="text-[#554dd6]">{t("learn.teacherAdded")}</span>
                        </>
                      ) : null}
                    </div>
                    <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-black text-[#6C63FF]">
                      {t("learn.openTopic")}
                      <span
                        aria-hidden
                        className="transition-transform duration-300 group-hover:translate-x-1"
                      >
                        →
                      </span>
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </ContentCard>

        <div className="grid content-start gap-5">
          <ContentCard>
            <h3 className="text-lg font-black tracking-tight text-pathwise-ink">{t("learn.weak")}</h3>
            <p className="mt-1 text-sm text-pathwise-muted">
              {t("learn.weakHint")}
            </p>
            {weak.length === 0 ? (
              <p className="mt-4 rounded-2xl bg-emerald-500/10 p-4 text-sm font-semibold leading-6 text-emerald-800">
                {t("learn.weakEmpty")}
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
                      <p className="mt-1 flex flex-wrap items-center gap-2 text-xs font-semibold text-pathwise-muted">
                        {spot.topicTitle}
                        {spot.topicId ? <ClipBadge topicId={spot.topicId} /> : null}
                      </p>
                    ) : null}
                    <div className="mt-2.5">
                      <ProgressBar value={spot.accuracy} color="#FF6B6B" />
                    </div>
                    {spot.topicId ? (
                      <Link
                        href={`/learning/topic/${spot.topicId}`}
                        className="mt-3 inline-flex text-xs font-black text-[#6C63FF]"
                      >
                        {t("learn.drill")}
                      </Link>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </ContentCard>

          <ContentCard>
            <h3 className="text-lg font-black tracking-tight text-pathwise-ink">{t("learn.nearGoals")}</h3>
            <div className="mt-4 grid gap-2.5">
              {profile.examDate ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-3.5">
                  <p className="text-sm font-black text-pathwise-ink">
                    {profile.goals.map((goal) => goalLabel(t, goal)).join(", ") || t("goal.unset")}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-pathwise-muted">
                    {t("learn.date", { date: profile.examDate })}
                  </p>
                  <p className="mt-2 text-sm font-black text-[#6C63FF]">
                    {days !== null && days >= 0 ? t("learn.left", { days: localizedCount(locale, "days", days) }) : t("learn.datePassed")}
                  </p>
                </div>
              ) : (
                <p className="text-sm leading-6 text-pathwise-muted">
                  {t("learn.noDate")}
                </p>
              )}
              {recommendations.slice(0, 2).map((item) => (
                <div key={item.topic.id} className="rounded-2xl bg-slate-50 p-3.5 ring-1 ring-slate-200">
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-pathwise-muted">
                    {t("learn.nextStep")}
                  </p>
                  <p className="mt-1 text-sm font-bold leading-6 text-pathwise-ink">
                    {t("learn.solveRest", {
                      title: item.topic.title,
                      tasks: localizedCount(
                        locale,
                        "tasks",
                        item.topic.tasks.length - topicStateOf(state, item.topic.id).solved.length,
                      ),
                    })}
                  </p>
                </div>
              ))}
            </div>
          </ContentCard>
        </div>
      </section>

      <ContentCard id="plan">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-black tracking-tight text-pathwise-ink">{t("learn.plan")}</h3>
            <p className="mt-1 text-sm text-pathwise-muted">
              {activePlan?.headline ?? t("learn.planSoon")}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {activePlan ? (
              <Pill tone={activePlan.source === "ai" ? "accent" : "muted"}>
                {activePlan.source === "ai" ? t("learn.planAi") : t("learn.planLocal")}
              </Pill>
            ) : null}
            <button
              type="button"
              onClick={() => void requestPlan()}
              disabled={planLoading || !localPlan}
              className="pw-btn-secondary text-sm disabled:opacity-50"
            >
              {planLoading ? t("learn.building") : t("learn.rebuild")}
            </button>
          </div>
        </div>

        {planError ? (
          <p className="mt-3 text-xs font-semibold text-[#c63d3d]">
            {t("learn.planFallback", { error: planError })}
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
                  {t("learn.week", { n: week.index })}
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
            {t("learn.planEmpty")}
          </p>
        )}
      </ContentCard>

      <ContentCard>
        <h3 className="text-lg font-black tracking-tight text-pathwise-ink">{t("learn.srs")}</h3>
        <p className="mt-1 text-sm text-pathwise-muted">
          {t("learn.srsHint")}
        </p>
        {reviews.length === 0 ? (
          <p className="mt-4 text-sm text-pathwise-muted">
            {t("learn.srsEmpty")}
          </p>
        ) : (
          <div className="mt-4 grid gap-2">
            {reviews.map((item) => {
              const next = new Date(Date.now() + Math.max(0, item.intervalDays - item.daysSince) * 86_400_000);
              const dateLabel = next.toLocaleDateString(
                locale === "kk" ? "kk-KZ" : locale === "en" ? "en-GB" : "ru-RU",
                { day: "numeric", month: "short" },
              );
              return (
                <Link
                  key={item.topic.id}
                  href={`/learning/topic/${item.topic.id}`}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 no-underline"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-bold text-pathwise-ink">{item.topic.title}</p>
                      <ClipBadge topicId={item.topic.id} />
                    </div>
                    <p className="text-xs font-semibold text-pathwise-muted">
                      {t("learn.srsMeta", { n: item.intervalDays, date: dateLabel })}
                    </p>
                  </div>
                  <Pill tone={item.urgency === "due" ? "warn" : "accent"}>
                    {item.urgency === "due" ? t("learn.dueNow") : t("learn.dueSoon")}
                  </Pill>
                </Link>
              );
            })}
          </div>
        )}
      </ContentCard>

      {state.attempts.length > 0 ? (
        <ContentCard>
          <h3 className="text-lg font-black tracking-tight text-pathwise-ink">{t("learn.activity")}</h3>
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
                      {t("learn.skillLevel", { skill: attempt.skill, n: attempt.difficulty })}
                    </p>
                  </div>
                  <Pill tone={attempt.correct ? "good" : "warn"}>
                    {attempt.correct ? t("learn.correct") : t("learn.wrong")}
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
