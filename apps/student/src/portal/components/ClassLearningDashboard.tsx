"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/i18n/I18nProvider";
import { localizedCount } from "@/lib/i18n-labels";
import { subjectTitle } from "@/lib/learning/catalog";
import {
  readAllTopics,
  readClassRoster,
  subscribeLearning,
  type StudentLearningSnapshot,
} from "@/lib/learning/store";
import type { Topic } from "@/lib/learning/types";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { pullClassBoard } from "@/lib/learning/remote";
import { asArray } from "@/lib/safe-list";
import { downloadLearningProgressReport } from "../lib/exportLearningProgress";

function levelTone(level: 1 | 2 | 3 | 4) {
  if (level >= 4) return "bg-emerald-100 text-emerald-900";
  if (level === 3) return "bg-[#6C63FF]/15 text-[#4b44b8]";
  if (level === 2) return "bg-amber-100 text-amber-900";
  return "bg-rose-100 text-rose-900";
}

function Bar({ value, color }: { value: number; color: string }) {
  const safe = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div className="h-2 w-full min-w-16 overflow-hidden rounded-full bg-slate-100">
      <div className="h-full rounded-full" style={{ width: `${safe}%`, backgroundColor: color }} />
    </div>
  );
}

function lastSeen(
  ts: number | undefined,
  t: (key: string, params?: Record<string, string | number>) => string,
) {
  if (!ts) return t("board.last");
  const mins = Math.round((Date.now() - ts) / 60_000);
  if (mins < 2) return t("board.justNow");
  if (mins < 60) return t("board.minAgo", { n: mins });
  const hours = Math.round(mins / 60);
  if (hours < 24) return t("board.hAgo", { n: hours });
  return t("board.dAgo", { n: Math.round(hours / 24) });
}

type BoardStudent = {
  id: string;
  snapshot: StudentLearningSnapshot;
  missedTasks: Array<{ topicId: string; taskId: string; skill: string; prompt: string }>;
  clipStats: { watched: number; dropped: number; stuck: number };
};

type HeatCell = { topicId: string; title: string; cells: Array<{ studentId: string; failing: boolean; accuracy: number | null }> };

/** Свод по обучению класса: только живые ученики, без демо-бейджа. */
export function ClassLearningDashboard() {
  const { t, locale } = useI18n();
  const [roster, setRoster] = useState<StudentLearningSnapshot[]>([]);
  const [boardStudents, setBoardStudents] = useState<BoardStudent[]>([]);
  const [heatmap, setHeatmap] = useState<HeatCell[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [subjectFilter, setSubjectFilter] = useState<string>("all");
  const [selected, setSelected] = useState<BoardStudent | null>(null);
  const [cellMissed, setCellMissed] = useState<{
    title: string;
    student: string;
    tasks: BoardStudent["missedTasks"];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setTopics(readAllTopics());
    if (isSupabaseConfigured()) {
      try {
        const board = await pullClassBoard();
        const students = asArray<BoardStudent>(board?.students);
        setBoardStudents(students);
        setHeatmap(asArray<HeatCell>(board?.heatmap));
        setRoster(students.map((s) => s.snapshot));
        setError(null);
        return;
      } catch (err) {
        setError(err instanceof Error ? err.message : t("board.loadFail"));
      }
    }
    setRoster(readClassRoster());
    setBoardStudents([]);
    setHeatmap([]);
  }, [t]);

  useEffect(() => {
    void load();
    return subscribeLearning(() => void load());
  }, [load]);

  const filtered = useMemo(
    () => (subjectFilter === "all" ? roster : roster.filter((s) => s.subjectId === subjectFilter)),
    [roster, subjectFilter],
  );

  const subjects = useMemo(
    () => Array.from(new Set(roster.map((student) => student.subjectId))),
    [roster],
  );

  const stats = useMemo(() => {
    const count = filtered.length || 1;
    return {
      total: filtered.length,
      avgMastery: Math.round(filtered.reduce((sum, s) => sum + s.mastery, 0) / count),
      avgAccuracy: Math.round(filtered.reduce((sum, s) => sum + s.accuracy, 0) / count),
      atRisk: filtered.filter((s) => s.accuracy < 60).length,
    };
  }, [filtered]);

  const weakTopics = useMemo(() => {
    const counts = new Map<string, number>();
    for (const student of filtered) {
      for (const topicId of student.weakTopics) {
        counts.set(topicId, (counts.get(topicId) ?? 0) + 1);
      }
    }
    return [...counts.entries()]
      .map(([topicId, count]) => ({
        topicId,
        count,
        title: topics.find((topic) => topic.id === topicId)?.title ?? topicId,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [filtered, topics]);

  const levelSpread = useMemo(() => {
    const spread: Record<1 | 2 | 3 | 4, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
    for (const student of filtered) spread[student.level] += 1;
    return spread;
  }, [filtered]);

  return (
    <div className="space-y-6">
      <section className="pw-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-pathwise-ink">{t("board.live")}</h2>
            <p className="mt-1 text-sm text-pathwise-muted">
              {t("board.liveHint")}
            </p>
            {error ? <p className="mt-2 text-sm text-rose-600">{error}</p> : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/hub/uchitelya"
              className="inline-flex min-h-12 items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-pathwise-ink no-underline"
            >
              {t("board.classCode")}
            </Link>
            <select
              id="subject-filter"
              value={subjectFilter}
              onChange={(event) => setSubjectFilter(event.target.value)}
              className="pw-input px-3 py-2 text-sm"
            >
              <option value="all">{t("board.allSubjects")}</option>
              {subjects.map((id) => (
                <option key={id} value={id}>
                  {subjectTitle(id)}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => downloadLearningProgressReport(filtered, topics)}
              className="inline-flex min-h-12 items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-pathwise-ink transition hover:border-[#6C63FF]"
            >
              {t("board.export")}
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: t("board.count"), value: String(stats.total), tone: "text-pathwise-ink" },
            { label: t("board.avgMastery"), value: `${stats.avgMastery}%`, tone: "text-[#6C63FF]" },
            { label: t("board.avgAccuracy"), value: `${stats.avgAccuracy}%`, tone: "text-emerald-600" },
            { label: t("board.atRisk"), value: String(stats.atRisk), tone: "text-[#E75555]" },
          ].map((item) => (
            <div key={item.label} className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-pathwise-muted">
                {item.label}
              </p>
              <p className={`mt-1 text-2xl font-black tracking-tight ${item.tone}`}>{item.value}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-sm font-semibold text-pathwise-ink">{t("board.levels")}</p>
            <div className="mt-4 grid gap-2.5">
              {([4, 3, 2, 1] as const).map((level) => {
                const count = levelSpread[level];
                const percent = stats.total > 0 ? (count / stats.total) * 100 : 0;
                return (
                  <div key={level} className="flex items-center gap-3">
                    <span className="w-28 shrink-0 text-xs font-bold text-pathwise-muted">
                      {t(`level.${level}`)}
                    </span>
                    <Bar value={percent} color={level >= 3 ? "#43D19E" : level === 2 ? "#6C63FF" : "#FF6B6B"} />
                    <span className="w-8 shrink-0 text-right text-xs font-black text-pathwise-ink">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-sm font-semibold text-pathwise-ink">{t("board.problem")}</p>
            {weakTopics.length === 0 ? (
              <p className="mt-3 text-sm text-pathwise-muted">
                {t("board.problemEmpty")}
              </p>
            ) : (
              <div className="mt-4 grid gap-2.5">
                {weakTopics.map((topic) => (
                  <div key={topic.topicId} className="flex items-center gap-3">
                    <span className="w-40 shrink-0 truncate text-xs font-bold text-pathwise-ink">
                      {topic.title}
                    </span>
                    <Bar value={(topic.count / Math.max(1, stats.total)) * 100} color="#FF6B6B" />
                    <span className="w-16 shrink-0 text-right text-xs font-bold text-pathwise-muted">
                      {localizedCount(locale, "students", topic.count)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {heatmap.length > 0 ? (
        <section className="pw-card p-6">
          <h2 className="text-lg font-semibold text-pathwise-ink">{t("board.heatmap")}</h2>
          <p className="mt-1 text-sm text-pathwise-muted">
            {t("board.heatmapHint")}
          </p>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-xs">
              <thead>
                <tr>
                  <th className="px-2 py-2 font-semibold text-pathwise-muted">{t("board.topic")}</th>
                  {boardStudents.map((student) => (
                    <th key={student.id} className="px-2 py-2 font-semibold text-pathwise-muted">
                      {(student.snapshot.name || student.snapshot.email).split(" ")[0]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {heatmap.map((row) => (
                  <tr key={row.topicId}>
                    <td className="px-2 py-2 font-bold text-pathwise-ink">{row.title}</td>
                    {row.cells.map((cell) => {
                      const student = boardStudents.find((item) => item.id === cell.studentId);
                      return (
                        <td key={cell.studentId} className="px-2 py-2">
                          <button
                            type="button"
                            onClick={() =>
                              setCellMissed({
                                title: row.title,
                                student: student?.snapshot.name || student?.snapshot.email || "",
                                tasks: (student?.missedTasks ?? []).filter((task) => task.topicId === row.topicId),
                              })
                            }
                            className={`h-9 w-9 rounded-lg ${
                              cell.failing ? "bg-[#FF6B6B] text-white" : "bg-emerald-100 text-emerald-900"
                            }`}
                            aria-label={`${row.title}: ${cell.failing ? t("board.gap") : t("board.ok")}`}
                          >
                            {cell.failing ? "!" : "·"}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {cellMissed ? (
            <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-sm font-black text-pathwise-ink">
                {cellMissed.student} · {cellMissed.title}
              </p>
              {cellMissed.tasks.length === 0 ? (
                <p className="mt-2 text-sm text-pathwise-muted">{t("board.missed")}</p>
              ) : (
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-pathwise-ink">
                  {cellMissed.tasks.map((task) => (
                    <li key={task.taskId}>
                      {task.prompt} <span className="text-pathwise-muted">({task.skill})</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : null}
        </section>
      ) : null}

      <section className="pw-card p-6">
        <h2 className="text-lg font-semibold text-pathwise-ink">{t("board.students")}</h2>
        <p className="mt-1 text-sm text-pathwise-muted">
          {t("board.studentsHint")} {t("board.emptyDemo")}
        </p>

        <div className="mt-5 overflow-x-auto rounded-2xl border border-slate-200 bg-slate-50">
          <table className="min-w-full divide-y divide-pathwise-line text-left text-sm">
            <thead className="bg-white text-xs font-semibold uppercase text-pathwise-muted">
              <tr>
                <th scope="col" className="px-4 py-3">{t("teacher.col.student")}</th>
                <th scope="col" className="px-4 py-3">{t("board.col.grade")}</th>
                <th scope="col" className="px-4 py-3">{t("board.col.subject")}</th>
                <th scope="col" className="px-4 py-3">{t("board.col.level")}</th>
                <th scope="col" className="px-4 py-3">{t("board.col.mastery")}</th>
                <th scope="col" className="px-4 py-3">{t("board.col.accuracy")}</th>
                <th scope="col" className="px-4 py-3">{t("board.col.activity")}</th>
                <th scope="col" className="px-4 py-3">{t("board.col.weak")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-pathwise-line bg-transparent">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-pathwise-muted">
                    {t("board.empty")}
                  </td>
                </tr>
              ) : (
                filtered.map((student) => {
                  const board = boardStudents.find((item) => item.snapshot.email === student.email);
                  return (
                    <tr
                      key={student.email}
                      className="cursor-pointer hover:bg-white"
                      onClick={() => board && setSelected(board)}
                    >
                      <td className="px-4 py-3">
                        <span className="font-medium text-pathwise-ink">{student.name || student.email}</span>
                      </td>
                      <td className="px-4 py-3 text-pathwise-muted">{student.grade}</td>
                      <td className="px-4 py-3 text-pathwise-muted">{subjectTitle(student.subjectId)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${levelTone(student.level)}`}>
                          {t(`level.${student.level}`)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Bar value={student.mastery} color="#6C63FF" />
                          <span className="w-10 shrink-0 text-xs font-bold text-pathwise-ink">{student.mastery}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-sm font-bold ${
                            student.accuracy >= 70
                              ? "text-emerald-600"
                              : student.accuracy >= 50
                                ? "text-amber-600"
                                : "text-[#E75555]"
                          }`}
                        >
                          {student.accuracy}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-pathwise-muted">
                        {lastSeen(student.lastActivityAt || student.updatedAt, t)}
                      </td>
                      <td className="max-w-xs px-4 py-3 text-xs text-pathwise-muted">
                        {student.weakTopics.length === 0
                          ? "—"
                          : student.weakTopics
                              .map((id) => topics.find((topic) => topic.id === id)?.title ?? id)
                              .join(", ")}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {selected ? (
          <div className="mt-5 rounded-2xl border border-[#6C63FF]/30 bg-white p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-black text-pathwise-ink">
                  {selected.snapshot.name || selected.snapshot.email}
                </h3>
                <p className="mt-1 text-sm text-pathwise-muted">
                  {t("board.weakSkills", {
                    list: selected.snapshot.weakTopics.join(", ") || t("board.noneYet"),
                  })}{" "}
                  · {t("board.clipsLine", {
                    w: selected.clipStats.watched,
                    d: selected.clipStats.dropped,
                    s: selected.clipStats.stuck,
                  })}
                </p>
              </div>
              <Link href="/hub/agent" className="pw-btn-secondary text-sm no-underline">
                {t("board.askAgent")}
              </Link>
            </div>
            {selected.missedTasks.length > 0 ? (
              <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-pathwise-ink">
                {selected.missedTasks.slice(0, 8).map((task) => (
                  <li key={task.taskId}>{task.prompt}</li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-pathwise-muted">{t("board.noMissedYet")}</p>
            )}
          </div>
        ) : null}

        <p className="mt-4 text-xs text-pathwise-muted">
          {t("board.learnFoot")}{" "}
          <Link href="/learning" className="font-semibold text-pathwise-accent underline-offset-2 hover:underline">
            {t("board.openLearn")}
          </Link>
        </p>
      </section>
    </div>
  );
}
