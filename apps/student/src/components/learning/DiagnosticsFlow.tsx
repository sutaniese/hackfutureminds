"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
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
  saveDiagnostic,
  upsertRosterEntry,
  writeLearningProfile,
} from "@/lib/learning/store";
import { LEARNING_GOALS, isAnswerCorrect, taskCorrectLabel } from "@/lib/learning/types";
import type { Difficulty, Grade, LearningGoalId, Task } from "@/lib/learning/types";
import { AnswerField } from "./AnswerField";
import { Pill, ProgressBar, StatTile } from "./LearningUI";

const GRADES: Grade[] = [7, 8, 9, 10, 11, 12];
const MINUTES_OPTIONS = [15, 30, 45, 60];

type Stage = "profile" | "test" | "result";

export function DiagnosticsFlow() {
  const router = useRouter();
  const { user } = useAuth();
  const { awardXp, setProfileCompletion } = useUserProgress();

  const [stage, setStage] = useState<Stage>("profile");
  const [grade, setGrade] = useState<Grade>(9);
  const [subjectId, setSubjectId] = useState<string>("math");
  const [goals, setGoals] = useState<LearningGoalId[]>(["ent"]);
  const [examDate, setExamDate] = useState("");
  const [minutesPerDay, setMinutesPerDay] = useState(30);

  const [pool, setPool] = useState<Task[]>([]);
  const [current, setCurrent] = useState<Task | null>(null);
  const [answer, setAnswer] = useState("");
  const [records, setRecords] = useState<DiagnosticRecord[]>([]);
  const [targetDifficulty, setTargetDifficulty] = useState<Difficulty>(2);
  const [result, setResult] = useState<ReturnType<typeof evaluateDiagnostic> | null>(null);

  const topics = useMemo(() => readAllTopics(), []);
  const subjectTopicCount = useMemo(
    () => topicsForSubject(topics, subjectId).length,
    [topics, subjectId],
  );

  const toggleGoal = useCallback((goal: LearningGoalId) => {
    setGoals((prev) => (prev.includes(goal) ? prev.filter((item) => item !== goal) : [...prev, goal]));
  }, []);

  const startTest = useCallback(() => {
    const allTopics = readAllTopics();
    const nextPool = diagnosticPool(allTopics, subjectId, grade);
    if (nextPool.length === 0) return;

    writeLearningProfile({
      grade,
      subjectId,
      goals: goals.length > 0 ? goals : ["school"],
      examDate: examDate || undefined,
      minutesPerDay,
    });

    setPool(nextPool);
    setRecords([]);
    setTargetDifficulty(2);
    setAnswer("");
    setCurrent(pickNextDiagnostic(nextPool, [], 2));
    setStage("test");
    setProfileCompletion(45);
  }, [examDate, goals, grade, minutesPerDay, setProfileCompletion, subjectId]);

  const finish = useCallback(
    (finalRecords: DiagnosticRecord[]) => {
      const evaluated = evaluateDiagnostic(subjectId, grade, finalRecords);
      saveDiagnostic(evaluated);
      setResult(evaluated);
      setStage("result");
      awardXp(40, `learning_diagnostic_${subjectId}`);
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
    [awardXp, goals, grade, setProfileCompletion, subjectId, user?.email, user?.name],
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
    const next = pickNextDiagnostic(pool, asked, difficulty);
    if (!next) {
      finish(nextRecords);
      return;
    }
    setCurrent(next);
  }, [answer, current, finish, pool, records, targetDifficulty]);

  /* ------------------------------ шаг 1: профиль ------------------------------ */

  if (stage === "profile") {
    return (
      <div className="flex flex-col gap-5">
        <ContentCard>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-pathwise-accent-strong">
            Шаг 1 из 3
          </p>
          <h2 className="mt-3 text-2xl font-black tracking-tight text-pathwise-ink">
            Расскажи о себе
          </h2>
          <p className="mt-2 text-sm leading-6 text-pathwise-muted">
            Класс, предмет и цель определяют, какие задания подберёт система и с какого уровня
            начнётся диагностика.
          </p>

          <div className="mt-6">
            <p className="text-sm font-black text-pathwise-ink">Класс</p>
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
          </div>

          <div className="mt-7">
            <p className="text-sm font-black text-pathwise-ink">Предмет</p>
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
          </div>

          <div className="mt-7">
            <p className="text-sm font-black text-pathwise-ink">Цель обучения</p>
            <p className="mt-1 text-xs text-pathwise-muted">Можно выбрать несколько.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {LEARNING_GOALS.map((goal) => {
                const active = goals.includes(goal.id);
                return (
                  <button
                    key={goal.id}
                    type="button"
                    onClick={() => toggleGoal(goal.id)}
                    aria-pressed={active}
                    title={goal.hint}
                    className={`min-h-12 rounded-full border px-4 text-sm font-bold transition ${
                      active
                        ? "border-[#6C63FF] bg-[#6C63FF]/10 text-[#554dd6]"
                        : "border-slate-200 bg-white text-pathwise-ink hover:border-[#6C63FF]/50"
                    }`}
                  >
                    {goal.title}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-7 grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="exam-date" className="text-sm font-black text-pathwise-ink">
                Дата экзамена или дедлайна
              </label>
              <p className="mt-1 text-xs text-pathwise-muted">Необязательно — влияет на длину плана.</p>
              <input
                id="exam-date"
                type="date"
                value={examDate}
                onChange={(event) => setExamDate(event.target.value)}
                className="pw-input mt-2 w-full px-4 py-3 text-sm font-semibold"
              />
            </div>
            <div>
              <p className="text-sm font-black text-pathwise-ink">Сколько минут в день готов заниматься</p>
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
                    {value} мин
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <button type="button" onClick={startTest} className="pw-btn-primary text-sm">
              Начать диагностику
            </button>
            <p className="text-xs font-semibold text-pathwise-muted">
              {DIAGNOSTIC_SIZE} вопросов · {subjectTopicCount} тем по предмету «{subjectTitle(subjectId)}»
            </p>
          </div>
        </ContentCard>
      </div>
    );
  }

  /* ------------------------------- шаг 2: тест ------------------------------- */

  if (stage === "test" && current) {
    const answered = records.length;
    const progress = (answered / DIAGNOSTIC_SIZE) * 100;

    return (
      <div className="flex flex-col gap-5">
        <ContentCard>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-pathwise-accent-strong">
              Шаг 2 из 3 · диагностика
            </p>
            <Pill tone="accent">
              Вопрос {answered + 1} из {DIAGNOSTIC_SIZE}
            </Pill>
          </div>
          <div className="mt-4">
            <ProgressBar value={progress} label={`Пройдено ${answered} из ${DIAGNOSTIC_SIZE}`} />
          </div>
          <p className="mt-3 text-xs font-semibold text-pathwise-muted">
            Сложность подстраивается: ответил верно — следующий вопрос сложнее, ошибся — легче.
            Результат и разбор появятся в конце.
          </p>
        </ContentCard>

        <ContentCard>
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
              className="pw-btn-primary text-sm disabled:opacity-50"
            >
              {answered + 1 === DIAGNOSTIC_SIZE ? "Завершить" : "Ответить"}
            </button>
            <span className="text-xs font-semibold text-pathwise-muted">
              Тема: {current.skill}
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
            Шаг 3 из 3 · результат
          </p>
          <h2 className="mt-3 text-2xl font-black tracking-tight text-pathwise-ink">
            Твой уровень: {LEVEL_LABELS[result.level]}
          </h2>
          <p className="mt-2 text-sm leading-6 text-pathwise-muted">
            Предмет «{subjectTitle(result.subjectId)}», {result.grade} класс. Система запомнила
            результат и подобрала стартовую сложность для каждой темы.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <StatTile label="Верных ответов" value={`${result.correct} из ${result.total}`} tone="accent" />
            <StatTile label="Точность" value={`${accuracy}%`} tone={accuracy >= 70 ? "good" : "warn"} />
            <StatTile label="Уровень" value={LEVEL_LABELS[result.level]} />
          </div>
        </ContentCard>

        <ContentCard>
          <h3 className="text-lg font-black tracking-tight text-pathwise-ink">Разбор по темам</h3>
          <p className="mt-1 text-sm text-pathwise-muted">
            Темы отсортированы от самых слабых — с них и начнём.
          </p>
          <div className="mt-5 grid gap-3">
            {topicRows.map((row) => (
              <div key={row.topicId} className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-black text-pathwise-ink">{row.title}</p>
                  <Pill tone={row.percent >= 70 ? "good" : row.percent >= 40 ? "accent" : "warn"}>
                    {row.score.correct} из {row.score.total}
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

        <ContentCard>
          <h3 className="text-lg font-black tracking-tight text-pathwise-ink">Разбор вопросов</h3>
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
                      {record.correct ? "верно" : "ошибка"}
                    </Pill>
                  </span>
                </summary>
                <p className="mt-3 text-sm font-bold text-pathwise-ink">
                  Правильный ответ: {taskCorrectLabel(record.task)}
                </p>
                <p className="mt-2 text-sm leading-6 text-pathwise-muted">{record.task.explanation}</p>
              </details>
            ))}
          </div>
        </ContentCard>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => router.push("/learning")}
            className="pw-btn-primary text-sm"
          >
            Открыть личный кабинет
          </button>
          <Link href="/learning/diagnostics" className="pw-btn-secondary text-sm" onClick={() => setStage("profile")}>
            Пройти заново
          </Link>
        </div>
      </div>
    );
  }

  return (
    <ContentCard>
      <p className="text-sm text-pathwise-muted">Готовим диагностику…</p>
    </ContentCard>
  );
}
