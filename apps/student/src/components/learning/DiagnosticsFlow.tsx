"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ContentCard } from "@/components/ui/PageHero";
import { useAuth } from "@/components/shell/useAuth";
import { useUserProgress } from "@/components/gamification/UserProgressProvider";
import { SUBJECTS, subjectTitle, topicsForSubject } from "@/lib/learning/catalog";
import {
  DIAGNOSTIC_SIZE,
  diagnosticPool,
  evaluateDiagnostic,
  nextDifficulty,
  pickNextDiagnostic,
  type DiagnosticRecord,
} from "@/lib/learning/recommend";
import {
  LEVEL_LABELS,
  readAllTopics,
  readLearningProfile,
  readLearningState,
  saveDiagnostic,
  seedDueReview,
  upsertRosterEntry,
  writeLearningProfile,
} from "@/lib/learning/store";
import { topicsLabel } from "@/lib/learning/plural";
import { LEARNING_GOALS, isAnswerCorrect, taskCorrectLabel } from "@/lib/learning/types";
import type { Difficulty, Grade, LearningGoalId, Task } from "@/lib/learning/types";
import { localizeTopic } from "@/lib/learning/kk-overlay";
import { useI18n } from "@/i18n/I18nProvider";
import { AnswerField } from "./AnswerField";
import { DifficultyBadge, Pill, ProgressBar, StatTile } from "./LearningUI";

const GRADES: Grade[] = [7, 8, 9, 10, 11, 12];
const MINUTES_OPTIONS = [15, 30, 45, 60];
const DRAFT_KEY = "ten-diagnostic-draft";

type Stage = "profile" | "test" | "result";
type ProfileStep = "grade" | "subject" | "goal";

type Draft = {
  stage: "test";
  grade: Grade;
  subjectId: string;
  goals: LearningGoalId[];
  examDate: string;
  minutesPerDay: number;
  askedIds: string[];
  records: Array<{ taskId: string; correct: boolean }>;
  targetDifficulty: Difficulty;
};

function readDraft(): Draft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Draft;
    if (parsed?.stage !== "test" || !Array.isArray(parsed.askedIds)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeDraft(draft: Draft | null): void {
  if (typeof window === "undefined") return;
  try {
    if (!draft) window.sessionStorage.removeItem(DRAFT_KEY);
    else window.sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch {
    /* ignore */
  }
}

const PROFILE_STEPS: ProfileStep[] = ["grade", "subject", "goal"];

function defaultExamDate(daysAhead = 21): string {
  const date = new Date();
  date.setDate(date.getDate() + daysAhead);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function profileStepIndex(step: ProfileStep): number {
  return PROFILE_STEPS.indexOf(step) + 1;
}

function pickQuestion(
  nextPool: Task[],
  askedIds: readonly string[],
  difficulty: Difficulty,
): Task | null {
  return (
    pickNextDiagnostic(nextPool, askedIds, difficulty) ??
    nextPool.find((task) => !askedIds.includes(task.id)) ??
    null
  );
}

export function DiagnosticsFlow() {
  const router = useRouter();
  const { user } = useAuth();
  const { locale, t } = useI18n();
  const { awardXp, earnBadge, setProfileCompletion } = useUserProgress();

  const [stage, setStage] = useState<Stage>("profile");
  const [grade, setGrade] = useState<Grade>(9);
  const [subjectId, setSubjectId] = useState<string>("math");
  const [goals, setGoals] = useState<LearningGoalId[]>(["ent"]);
  const [examDate, setExamDate] = useState(defaultExamDate);
  const [minutesPerDay, setMinutesPerDay] = useState(30);
  const [profileStep, setProfileStep] = useState<ProfileStep>("grade");

  const [pool, setPool] = useState<Task[]>([]);
  const [current, setCurrent] = useState<Task | null>(null);
  const [answer, setAnswer] = useState("");
  const [records, setRecords] = useState<DiagnosticRecord[]>([]);
  const [targetDifficulty, setTargetDifficulty] = useState<Difficulty>(2);
  const [result, setResult] = useState<ReturnType<typeof evaluateDiagnostic> | null>(null);

  const topics = useMemo(
    () => readAllTopics().map((topic) => localizeTopic(topic, locale === "kk" ? "kk" : "ru")),
    [locale],
  );
  const subjectTopicCount = useMemo(
    () => topicsForSubject(topics, subjectId).length,
    [topics, subjectId],
  );

  useEffect(() => {
    const draft = readDraft();
    if (draft) {
      const allTopics = readAllTopics().map((topic) => localizeTopic(topic, locale === "kk" ? "kk" : "ru"));
      const nextPool = diagnosticPool(allTopics, draft.subjectId, draft.grade);
      const restoredRecords: DiagnosticRecord[] = draft.records
        .map((item) => {
          const task = nextPool.find((entry) => entry.id === item.taskId);
          return task ? { task, correct: item.correct } : null;
        })
        .filter((item): item is DiagnosticRecord => Boolean(item));
      setGrade(draft.grade);
      setSubjectId(draft.subjectId);
      setGoals(draft.goals.length ? draft.goals : ["ent"]);
      setExamDate(draft.examDate || defaultExamDate());
      setMinutesPerDay(draft.minutesPerDay);
      setPool(nextPool);
      setRecords(restoredRecords);
      setTargetDifficulty(draft.targetDifficulty);
      setCurrent(pickQuestion(nextPool, restoredRecords.map((r) => r.task.id), draft.targetDifficulty));
      setStage("test");
      return;
    }
    const saved = readLearningState().diagnostic;
    if (!saved) return;
    const profile = readLearningProfile();
    if (profile) {
      setGrade(profile.grade);
      setSubjectId(profile.subjectId);
      setGoals(profile.goals.length ? profile.goals : ["ent"]);
      setExamDate(profile.examDate || defaultExamDate());
      setMinutesPerDay(profile.minutesPerDay);
    }
    setResult(saved);
    setStage("result");
    // Restore once on mount. Locale for KK overlay is read from the current i18n value
    // inside the draft branch; re-running on locale change would wipe an in-progress test.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleGoal = useCallback((goal: LearningGoalId) => {
    setGoals((prev) => (prev.includes(goal) ? prev.filter((item) => item !== goal) : [...prev, goal]));
  }, []);

  const startTest = useCallback(() => {
    const allTopics = readAllTopics().map((topic) => localizeTopic(topic, locale === "kk" ? "kk" : "ru"));
    const nextPool = diagnosticPool(allTopics, subjectId, grade);
    if (nextPool.length === 0) return;

    writeLearningProfile({
      grade,
      subjectId,
      goals: goals.length > 0 ? goals : ["school"],
      examDate: examDate || defaultExamDate(),
      minutesPerDay,
    });

    setPool(nextPool);
    setRecords([]);
    setTargetDifficulty(2);
    setAnswer("");
    const first = pickQuestion(nextPool, [], 2);
    setCurrent(first);
    setStage("test");
    setProfileCompletion(45);
    if (first) {
      writeDraft({
        stage: "test",
        grade,
        subjectId,
        goals: goals.length > 0 ? goals : ["school"],
        examDate: examDate || defaultExamDate(),
        minutesPerDay,
        askedIds: [],
        records: [],
        targetDifficulty: 2,
      });
    }
  }, [examDate, goals, grade, locale, minutesPerDay, setProfileCompletion, subjectId]);

  const finish = useCallback(
    (finalRecords: DiagnosticRecord[]) => {
      const evaluated = evaluateDiagnostic(subjectId, grade, finalRecords);
      saveDiagnostic(evaluated);
      writeDraft(null);
      const weakTopicId = Object.entries(evaluated.byTopic)
        .filter(([, score]) => score.total > 0 && score.correct / score.total < 0.6)
        .map(([topicId]) => topicId)[0] ?? Object.keys(evaluated.byTopic)[0];
      if (weakTopicId) seedDueReview(weakTopicId);
      setResult(evaluated);
      setStage("result");
      awardXp(40, `learning_diagnostic_${subjectId}`);
      earnBadge("level_checked");
      setProfileCompletion(60);

      if (user?.email) {
        const weakTopics = Object.entries(evaluated.byTopic)
          .filter(([, score]) => score.total > 0 && score.correct / score.total < 0.6)
          .map(([topicId]) => topicId);

        upsertRosterEntry({
          email: user.email,
          name: user.name,
          grade,
          subjectId,
          goals,
          level: evaluated.level,
          mastery: 0,
          accuracy: Math.round((evaluated.correct / Math.max(1, evaluated.total)) * 100),
          solvedTasks: 0,
          weakTopics,
          updatedAt: Date.now(),
        });
      }
    },
    [awardXp, earnBadge, goals, grade, setProfileCompletion, subjectId, user?.email, user?.name],
  );

  const submitAnswer = useCallback(() => {
    if (!current || answer === "") return;

    const correct = isAnswerCorrect(current, answer);
    const nextRecords = [...records, { task: current, correct }];
    setRecords(nextRecords);
    setAnswer("");

    if (nextRecords.length >= DIAGNOSTIC_SIZE) {
      finish(nextRecords);
      return;
    }

    const difficulty = nextDifficulty(targetDifficulty, correct);
    setTargetDifficulty(difficulty);

    const asked = nextRecords.map((record) => record.task.id);
    const next = pickQuestion(pool, asked, difficulty);
    if (!next) {
      finish(nextRecords);
      return;
    }
    setCurrent(next);
    writeDraft({
      stage: "test",
      grade,
      subjectId,
      goals: goals.length > 0 ? goals : ["school"],
      examDate: examDate || defaultExamDate(),
      minutesPerDay,
      askedIds: asked,
      records: nextRecords.map((record) => ({ taskId: record.task.id, correct: record.correct })),
      targetDifficulty: difficulty,
    });
  }, [answer, current, examDate, finish, goals, grade, minutesPerDay, pool, records, subjectId, targetDifficulty]);

  /* ------------------------------ шаг 1: профиль ------------------------------ */

  if (stage === "profile") {
    const stepNumber = profileStepIndex(profileStep);
    const selectedSubject = SUBJECTS.find((item) => item.id === subjectId);

    return (
      <div className="flex flex-col gap-5">
        <ContentCard key={profileStep} className="pw-reveal">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-pathwise-accent-strong">
            {t("diag.step1")}
          </p>
          <h2 className="mt-3 text-2xl font-black tracking-tight text-pathwise-ink">
            {profileStep === "grade"
              ? t("diag.askGrade")
              : profileStep === "subject"
                ? t("diag.askSubject")
                : t("diag.askGoal")}
          </h2>
          <p className="mt-2 text-sm leading-6 text-pathwise-muted">
            {profileStep === "grade"
              ? t("diag.hintGrade")
              : profileStep === "subject"
                ? t("diag.hintSubject")
                : t("diag.hintGoal")}
          </p>

          {profileStep === "grade" ? (
            <div className="mt-6">
              <p className="text-sm font-black text-pathwise-ink">{t("diag.grade")}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {GRADES.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setGrade(item)}
                    aria-pressed={grade === item}
                    className={`min-h-12 min-w-14 rounded-full border px-4 text-sm font-black transition ${
                      grade === item
                        ? "border-[#6C63FF] bg-[#6C63FF] text-white shadow-sm"
                        : "border-slate-200 bg-white text-pathwise-ink hover:border-[#6C63FF]/50"
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => setProfileStep("subject")}
                  className="pw-btn-primary text-sm"
                >
                  {t("diag.nextSubject")}
                </button>
                <p className="text-xs font-semibold text-pathwise-muted">{t("diag.pickedGrade", { n: grade })}</p>
              </div>
            </div>
          ) : null}

          {profileStep === "subject" ? (
            <div className="mt-6">
              <p className="text-sm font-black text-pathwise-ink">{t("diag.subject")}</p>
              <div className="mt-3 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                {SUBJECTS.map((subject) => {
                  const active = subject.id === subjectId;
                  return (
                    <button
                      key={subject.id}
                      type="button"
                      onClick={() => setSubjectId(subject.id)}
                      aria-pressed={active}
                      className={`flex min-h-20 items-start gap-3 rounded-2xl border p-4 text-left transition ${
                        active
                          ? "border-[#6C63FF] bg-[#6C63FF]/5 shadow-sm"
                          : "border-slate-200 bg-white hover:border-[#6C63FF]/50"
                      }`}
                    >
                      <span
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-base font-black text-white"
                        style={{ backgroundColor: subject.accent }}
                        aria-hidden
                      >
                        {subject.mark}
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-black text-pathwise-ink">{subject.title}</span>
                        <span className="mt-1 block text-xs leading-5 text-pathwise-muted">
                          {subject.description}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => setProfileStep("grade")}
                  className="pw-btn-secondary text-sm"
                >
                  {t("diag.back")}
                </button>
                <button
                  type="button"
                  onClick={() => setProfileStep("goal")}
                  className="pw-btn-primary text-sm"
                >
                  {t("diag.nextGoal")}
                </button>
                <p className="text-xs font-semibold text-pathwise-muted">
                  {topicsLabel(subjectTopicCount)} · {selectedSubject?.title ?? subjectTitle(subjectId)}
                </p>
              </div>
            </div>
          ) : null}

          {profileStep === "goal" ? (
            <div className="mt-6">
              <p className="text-sm font-black text-pathwise-ink">{t("diag.goal")}</p>
              <p className="mt-1 text-xs text-pathwise-muted">{t("diag.goalHint")}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {LEARNING_GOALS.map((goal) => {
                  const active = goals.includes(goal.id);
                  return (
                    <button
                      key={goal.id}
                      type="button"
                      onClick={() => toggleGoal(goal.id)}
                      aria-pressed={active}
                      title={t(`goal.${goal.id}.hint`)}
                      className={`min-h-12 rounded-full border px-4 text-sm font-bold transition ${
                        active
                          ? "border-[#6C63FF] bg-[#6C63FF]/10 text-[#554dd6]"
                          : "border-slate-200 bg-white text-pathwise-ink hover:border-[#6C63FF]/50"
                      }`}
                    >
                      {t(goal.id === "ent" ? "goal.ent" : `goal.${goal.id}`)}
                    </button>
                  );
                })}
              </div>

              <div className="mt-7 grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="exam-date" className="text-sm font-black text-pathwise-ink">
                    {t("diag.exam")}
                  </label>
                  <p className="mt-1 text-xs text-pathwise-muted">
                    {t("diag.examHint")}
                  </p>
                  <input
                    id="exam-date"
                    type="date"
                    value={examDate}
                    onChange={(event) => setExamDate(event.target.value)}
                    className="pw-input mt-2 w-full px-4 py-3 text-sm font-semibold"
                  />
                </div>
                <div>
                  <p className="text-sm font-black text-pathwise-ink">{t("diag.minutes")}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {MINUTES_OPTIONS.map((value) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setMinutesPerDay(value)}
                        aria-pressed={minutesPerDay === value}
                        className={`min-h-12 rounded-full border px-4 text-sm font-bold transition ${
                          minutesPerDay === value
                            ? "border-[#6C63FF] bg-[#6C63FF] text-white"
                            : "border-slate-200 bg-white text-pathwise-ink hover:border-[#6C63FF]/50"
                        }`}
                      >
                        {t("plural.min", { n: value })}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => setProfileStep("subject")}
                  className="pw-btn-secondary text-sm"
                >
                  {t("diag.back")}
                </button>
                <button type="button" onClick={startTest} className="pw-btn-primary text-sm">
                  {t("diag.start")}
                </button>
                <p className="text-xs font-semibold text-pathwise-muted">
                  {t("diag.meta", {
                    n: DIAGNOSTIC_SIZE,
                    topics: topicsLabel(subjectTopicCount),
                    subject: subjectTitle(subjectId),
                  })}
                </p>
              </div>
            </div>
          ) : null}
        </ContentCard>
      </div>
    );
  }

  /* ------------------------------- шаг 2: тест ------------------------------- */

  if (stage === "test") {
    if (!current) {
      return (
        <ContentCard>
          <p className="text-sm text-pathwise-muted">
            {t("diag.noNext")}{" "}
            <button type="button" className="font-bold text-[#554dd6]" onClick={() => finish(records)}>
              {t("diag.showResult")}
            </button>
          </p>
        </ContentCard>
      );
    }
    const answered = records.length;
    const progress = (answered / DIAGNOSTIC_SIZE) * 100;

    return (
      <div className="flex flex-col gap-5">
        <ContentCard>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-pathwise-accent-strong">
            {t("diag.step2")}
          </p>
          <Pill tone="accent">
            {t("diag.qOf", { a: answered + 1, b: DIAGNOSTIC_SIZE })}
          </Pill>
          </div>
          <div className="mt-4">
            <ProgressBar value={progress} label={t("diag.progress", { a: answered, b: DIAGNOSTIC_SIZE })} />
          </div>
          <p className="mt-3 text-xs font-semibold text-pathwise-muted">
            {t("diag.adapt")}
          </p>
        </ContentCard>

        <ContentCard key={current.id} className="pw-reveal">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-pathwise-accent-strong">
              {t("diag.qOf", { a: answered + 1, b: DIAGNOSTIC_SIZE })}
            </p>
            <DifficultyBadge difficulty={current.difficulty} />
          </div>
          {current.passage ? (
            <p className="mb-4 rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-700 ring-1 ring-slate-200">
              {current.passage}
            </p>
          ) : null}
          <p className="text-lg font-black leading-7 text-pathwise-ink">{current.prompt}</p>
          <AnswerField task={current} value={answer} onChange={setAnswer} />
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={submitAnswer}
              disabled={answer === ""}
              className="pw-btn-primary pw-press text-sm transition disabled:opacity-50"
            >
              {answered + 1 === DIAGNOSTIC_SIZE ? t("diag.done") : t("diag.answer")}
            </button>
            <span className="text-xs font-semibold text-pathwise-muted">
              {t("diag.topicSkill", { skill: current.skill })}
            </span>
          </div>
        </ContentCard>
      </div>
    );
  }

  /* ------------------------------ шаг 3: результат --------------------------- */

  if (stage === "result" && result) {
    const accuracy = Math.round((result.correct / Math.max(1, result.total)) * 100);
    const topicRows = Object.entries(result.byTopic)
      .map(([topicId, score]) => {
        const topic = topics.find((item) => item.id === topicId);
        return {
          topicId,
          title: topic?.title ?? topicId,
          score,
          percent: Math.round((score.correct / Math.max(1, score.total)) * 100),
        };
      })
      .sort((a, b) => a.percent - b.percent);

    return (
      <div className="flex flex-col gap-5">
        <ContentCard>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-pathwise-accent-strong">
            {t("diag.step3")}
          </p>
          <h2 className="mt-3 text-2xl font-black tracking-tight text-pathwise-ink">
            {t("diag.yourLevel", { level: t(`level.${result.level}`) })}
          </h2>
          <p className="mt-2 text-sm leading-6 text-pathwise-muted">
            {t("diag.resultHint", { subject: subjectTitle(result.subjectId), grade: result.grade })}
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <StatTile label={t("diag.correctOf")} value={t("diag.of", { a: result.correct, b: result.total })} tone="accent" />
            <StatTile label={t("learn.accuracy")} value={`${accuracy}%`} tone={accuracy >= 70 ? "good" : "warn"} />
            <StatTile label={t("diag.levelShort")} value={t(`level.${result.level}`)} />
          </div>
        </ContentCard>

        <ContentCard>
          <h3 className="text-lg font-black tracking-tight text-pathwise-ink">{t("diag.byTopic")}</h3>
          <p className="mt-1 text-sm text-pathwise-muted">
            {t("diag.byTopicHint")}
          </p>
          <div className="mt-5 grid gap-3">
            {topicRows.map((row) => (
              <div key={row.topicId} className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-black text-pathwise-ink">{row.title}</p>
                  <Pill tone={row.percent >= 70 ? "good" : row.percent >= 40 ? "accent" : "warn"}>
                    {t("diag.of", { a: row.score.correct, b: row.score.total })}
                  </Pill>
                </div>
                <div className="mt-3">
                  <ProgressBar
                    value={row.percent}
                    color={row.percent >= 70 ? "#43D19E" : row.percent >= 40 ? "#6C63FF" : "#FF6B6B"}
                  />
                </div>
              </div>
            ))}
          </div>
        </ContentCard>

        {records.length > 0 ? (
        <ContentCard>
          <h3 className="text-lg font-black tracking-tight text-pathwise-ink">{t("diag.byQuestion")}</h3>
          <div className="mt-4 grid gap-3">
            {records.map((record, index) => (
              <details
                key={record.task.id}
                className="rounded-2xl border border-slate-200 bg-white p-4"
              >
                <summary className="cursor-pointer list-none">
                  <span className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-bold text-pathwise-ink">
                      {index + 1}. {record.task.prompt}
                    </span>
                    <Pill tone={record.correct ? "good" : "warn"}>
                      {record.correct ? t("learn.correct") : t("learn.wrong")}
                    </Pill>
                  </span>
                </summary>
                <p className="mt-3 text-sm font-bold text-pathwise-ink">
                  {t("diag.rightAnswer", { answer: taskCorrectLabel(record.task) })}
                </p>
                <p className="mt-2 text-sm leading-6 text-pathwise-muted">{record.task.explanation}</p>
              </details>
            ))}
          </div>
        </ContentCard>
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => router.push("/learning")}
            className="pw-btn-primary text-sm"
          >
            {t("diag.openDash")}
          </button>
          <Link href="/roadmap" className="pw-btn-secondary text-sm">
            {t("diag.toRoadmap")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <ContentCard>
      <p className="text-sm text-pathwise-muted">{t("diag.preparing")}</p>
    </ContentCard>
  );
}
