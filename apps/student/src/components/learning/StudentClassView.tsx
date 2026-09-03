"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ContentCard, PageHero } from "@/components/ui/PageHero";
import { ClassJoinCard } from "@/components/learning/ClassJoinCard";
import { ClipBadge, Pill } from "@/components/learning/LearningUI";
import { useLearning } from "@/components/learning/useLearning";
import { useI18n } from "@/i18n/I18nProvider";
import { daysUntil, isTopicComplete, topicStateOf, weakSpots } from "@/lib/learning/recommend";
import { readLocalClassJoin, subscribeLocalClass } from "@/lib/learning/class-local";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import type { StudentClassOverview, StudentHomeworkItem } from "@/lib/learning/class-overview";
import { daysLabel } from "@/lib/learning/plural";
import { localizedCount } from "@/lib/i18n-labels";

const EMPTY: StudentClassOverview = {
  configured: false,
  class: null,
  memberCount: 0,
  classmates: [],
  homework: [],
  exams: [],
};

function statusTone(status: StudentHomeworkItem["status"]): "accent" | "warn" | "good" {
  if (status === "done") return "good";
  if (status === "in_progress") return "accent";
  return "warn";
}

export function StudentClassView() {
  const { t, locale } = useI18n();
  const { profile, state, topics, ready, inviteCode } = useLearning();
  const [remote, setRemote] = useState<StudentClassOverview>(EMPTY);
  const [copied, setCopied] = useState(false);
  const [localTick, setLocalTick] = useState(0);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/learning/class", { credentials: "same-origin" });
      const json = (await res.json()) as StudentClassOverview & { error?: string };
      if (!res.ok || json.error) {
        setRemote({ ...EMPTY, configured: isSupabaseConfigured() });
        return;
      }
      setRemote(json);
    } catch {
      setRemote({ ...EMPTY, configured: isSupabaseConfigured() });
    }
  }, []);

  useEffect(() => {
    void load();
    return subscribeLocalClass(() => setLocalTick((n) => n + 1));
  }, [load]);

  const local = useMemo(() => {
    void localTick;
    return readLocalClassJoin();
  }, [localTick]);

  const days = daysUntil(profile?.examDate);
  const weak = useMemo(() => weakSpots(topics, state, 5), [state, topics]);

  const classInfo = remote.class
    ? remote.class
    : local
      ? {
          id: local.classId,
          name: local.name,
          inviteCode: local.inviteCode,
          teacherName: local.teacherName ?? null,
        }
      : inviteCode
        ? { id: "local", name: inviteCode, inviteCode, teacherName: null }
        : null;

  const homework = useMemo(() => {
    if (remote.homework.length) return remote.homework;
    return topics
      .filter((topic) => topic.custom)
      .map((topic) => {
        const status: StudentHomeworkItem["status"] = isTopicComplete(topic, state)
          ? "done"
          : topicStateOf(state, topic.id).attempts > 0
            ? "in_progress"
            : "assigned";
        return {
          id: topic.id,
          title: topic.title,
          summary: topic.summary,
          author: topic.author,
          status,
          hasClip: Boolean(topic.liveClip),
        };
      });
  }, [remote.homework, state, topics]);

  const exams = useMemo(() => {
    if (remote.exams.length) return remote.exams;
    if (profile?.examDate) {
      return [{ title: profile.examDate, date: profile.examDate, source: "profile" as const }];
    }
    return [];
  }, [profile?.examDate, remote.exams]);

  const memberCount = remote.memberCount || (classInfo ? 1 : 0);

  if (!ready) {
    return <div className="pw-shimmer min-h-[24rem] rounded-[2rem] bg-white" aria-hidden />;
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHero compact kicker={t("class.kicker")} title={t("class.title")} description={t("class.desc")}>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link href="/learning" className="pw-btn-secondary text-sm no-underline">
            {t("class.toLearn")}
          </Link>
          <Link href="/learning#plan" className="pw-btn-secondary text-sm no-underline">
            {t("class.toPlan")}
          </Link>
          <Link href="/learning/clips" className="pw-btn-primary text-sm no-underline">
            {t("class.toClips")}
          </Link>
        </div>
      </PageHero>

      {!classInfo ? (
        <ClassJoinCard
          currentCode={null}
          onJoined={() => {
            void load();
            setLocalTick((n) => n + 1);
          }}
        />
      ) : (
        <ClassJoinCard
          currentCode={classInfo.inviteCode}
          compact
          onJoined={() => {
            void load();
            setLocalTick((n) => n + 1);
          }}
        />
      )}

      {classInfo ? (
        <ContentCard>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-pathwise-accent-strong">
            {t("class.teacherClass")}
          </p>
          <h2 className="mt-2 text-2xl font-black tracking-tight text-pathwise-ink">{classInfo.name}</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-pathwise-muted">{t("class.teacher")}</p>
              <p className="mt-1 text-sm font-black text-pathwise-ink">
                {classInfo.teacherName || t("class.teacherUnknown")}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-pathwise-muted">{t("class.invite")}</p>
              <p className="mt-1 font-mono text-lg font-black tracking-widest text-[#554dd6]">{classInfo.inviteCode}</p>
              <button
                type="button"
                className="mt-2 text-xs font-bold text-[#554dd6]"
                onClick={() => {
                  void navigator.clipboard?.writeText(classInfo.inviteCode);
                  setCopied(true);
                  window.setTimeout(() => setCopied(false), 1500);
                }}
              >
                {copied ? t("class.copied") : t("class.copy")}
              </button>
            </div>
          </div>
          <div className="mt-4 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-pathwise-muted">{t("class.mates")}</p>
            <p className="mt-1 text-sm font-black text-pathwise-ink">
              {t("class.matesCount", { n: memberCount })}
              {locale !== "ru" ? ` · ${localizedCount(locale, "students", memberCount)}` : null}
            </p>
            {remote.classmates.length > 0 ? (
              <ul className="mt-2 flex flex-wrap gap-2">
                {remote.classmates.map((mate) => (
                  <li key={mate.displayName}>
                    <Pill>{mate.displayName}</Pill>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-xs font-semibold text-pathwise-muted">{t("class.matesHidden")}</p>
            )}
          </div>
          {local?.localOnly || !remote.configured ? (
            <p className="mt-3 text-xs font-semibold text-pathwise-muted">{t("class.needsServer")}</p>
          ) : null}
        </ContentCard>
      ) : (
        <ContentCard>
          <p className="text-sm leading-6 text-pathwise-muted">{t("class.notIn")}</p>
        </ContentCard>
      )}

      <ContentCard>
        <h3 className="text-lg font-black tracking-tight text-pathwise-ink">{t("class.homework")}</h3>
        <p className="mt-1 text-sm text-pathwise-muted">{t("class.homeworkHint")}</p>
        {homework.length === 0 ? (
          <p className="mt-4 text-sm text-pathwise-muted">{t("class.hwEmpty")}</p>
        ) : (
          <div className="mt-4 grid gap-3">
            {homework.map((item) => (
              <Link
                key={item.id}
                href={`/learning/topic/${item.id}`}
                className="block rounded-2xl border border-slate-200 bg-white p-4 no-underline"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <p className="text-sm font-black text-pathwise-ink">{item.title}</p>
                    <ClipBadge topicId={item.id} />
                  </div>
                  <Pill tone={statusTone(item.status)}>
                    {item.status === "done"
                      ? t("class.hwDone")
                      : item.status === "in_progress"
                        ? t("class.hwDoing")
                        : t("class.hwAssigned")}
                  </Pill>
                </div>
                {item.summary ? <p className="mt-2 text-sm text-pathwise-muted">{item.summary}</p> : null}
                {item.author ? <p className="mt-1 text-xs font-semibold text-pathwise-muted">{item.author}</p> : null}
              </Link>
            ))}
          </div>
        )}
      </ContentCard>

      <ContentCard>
        <h3 className="text-lg font-black tracking-tight text-pathwise-ink">{t("class.exams")}</h3>
        {exams.length === 0 ? (
          <p className="mt-3 text-sm text-pathwise-muted">{t("class.examEmpty")}</p>
        ) : (
          <div className="mt-4 grid gap-3">
            {exams.map((exam) => (
              <div key={`${exam.source}-${exam.date ?? exam.title}`} className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-sm font-black text-pathwise-ink">{exam.date ?? exam.title}</p>
                <p className="mt-1 text-xs font-semibold text-pathwise-muted">
                  {exam.source === "teacher" ? t("class.examTeacher") : t("class.examProfile")}
                </p>
                {exam.source === "profile" && days !== null ? (
                  <p className="mt-2 text-sm font-black text-[#6C63FF]">
                    {days >= 0 ? t("learn.left", { days: daysLabel(days) }) : t("learn.datePassed")}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </ContentCard>

      <ContentCard>
        <h3 className="text-lg font-black tracking-tight text-pathwise-ink">{t("class.links")}</h3>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/learning/clips" className="pw-btn-primary text-sm no-underline">
            {t("class.toClips")}
          </Link>
          <Link href="/learning#plan" className="pw-btn-secondary text-sm no-underline">
            {t("class.toPlan")}
          </Link>
          {weak[0]?.topicId ? (
            <Link href={`/learning/topic/${weak[0].topicId}`} className="pw-btn-secondary text-sm no-underline">
              {t("class.toWeak")}
            </Link>
          ) : (
            <Link href="/learning" className="pw-btn-secondary text-sm no-underline">
              {t("class.toWeak")}
            </Link>
          )}
        </div>
      </ContentCard>
    </div>
  );
}
