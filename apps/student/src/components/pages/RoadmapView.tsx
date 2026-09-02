"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ContentCard, PageHero } from "@/components/ui/PageHero";
import { readLearningProfile, readLearningState } from "@/lib/learning/store";
import { resolveActiveLearningGoal } from "@/lib/learning/goal-priority";
import {
  buildPersonalRoadmap,
  goalTitleFor,
  inferTrack,
  readinessScore,
  type RoadmapNode,
} from "@/lib/roadmap/personalRoadmap";
import { readCurrentStudentProfile } from "@/lib/student-profile-store";
import { isOnboardingComplete, readCurrentOnboarding } from "@/lib/student-progress";
import { readTargetUniversity } from "@/portal/lib/targetUniversity";
import type { OnboardingAnswers } from "@/types/onboarding";
import { useI18n } from "@/i18n/I18nProvider";
import { subjectTitle } from "@/lib/learning/catalog";

const TONE: Record<RoadmapNode["tone"], { fill: string; stroke: string; soft: string; text: string }> = {
  purple: { fill: "#6C63FF", stroke: "#564DE6", soft: "bg-[#6C63FF]/10", text: "text-[#5B54D8]" },
  green: { fill: "#43D19E", stroke: "#2FB985", soft: "bg-[#43D19E]/12", text: "text-emerald-700" },
  red: { fill: "#FF6B6B", stroke: "#E75555", soft: "bg-[#FF6B6B]/10", text: "text-red-600" },
  slate: { fill: "#64748B", stroke: "#475569", soft: "bg-slate-100", text: "text-slate-700" },
};

export function RoadmapView() {
  const { t, locale } = useI18n();
  const [answers, setAnswers] = useState<OnboardingAnswers | null>(null);
  const [ready, setReady] = useState(false);
  const [activeId, setActiveId] = useState("vision");

  useEffect(() => {
    setAnswers(readCurrentOnboarding());
    setReady(true);
  }, []);

  const diagnostic = ready ? readLearningState().diagnostic : null;
  const profile = ready ? readLearningProfile() : null;
  const generated = ready ? readCurrentStudentProfile()?.generated ?? null : null;
  const targetUniversity = ready ? readTargetUniversity() : null;
  const goal = resolveActiveLearningGoal(profile, answers);
  const subject = diagnostic ? subjectTitle(diagnostic.subjectId) : profile ? subjectTitle(profile.subjectId) : "—";

  const nodes = useMemo(
    () =>
      buildPersonalRoadmap({
        answers,
        diagnostic,
        profile,
        generated,
        targetUniversity,
        locale,
      }),
    [answers, diagnostic, generated, locale, profile, targetUniversity],
  );
  const track = useMemo(
    () => inferTrack(answers, diagnostic, generated, locale, goal),
    [answers, diagnostic, generated, goal, locale],
  );
  const active = nodes.find((node) => node.id === activeId) ?? nodes[0];
  const score = readinessScore({ answers, diagnostic, generated, profile });
  const onboardingDone = isOnboardingComplete(answers);

  if (!ready) {
    return <div className="pw-shimmer min-h-[32rem] rounded-[2rem] bg-white" aria-hidden />;
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHero kicker={t("roadmap.kicker")} title={t("roadmap.title")} description={t("roadmap.desc")}>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <HeroMetric label={t("roadmap.goal")} value={goalTitleFor(locale, goal)} />
          <HeroMetric label={t("roadmap.subject")} value={subject} />
          <HeroMetric label={t("roadmap.ready")} value={`${score}%`} />
        </div>
        <p className="mt-3 text-xs font-semibold text-pathwise-muted">{track.label}</p>
      </PageHero>

      {!onboardingDone && !profile ? (
        <ContentCard className="border-l-4 border-l-[#6C63FF]">
          <p className="text-sm font-semibold text-pathwise-ink">{t("roadmap.needOnboard")}</p>
          <p className="mt-1 text-sm text-pathwise-muted">{t("roadmap.needOnboardHint")}</p>
          <Link href="/onboarding" className="pw-btn-primary mt-4 inline-flex !min-h-12 !px-5">
            {t("roadmap.fill")}
          </Link>
        </ContentCard>
      ) : null}

      <section className="grid gap-5 xl:grid-cols-[1.25fr_0.75fr]" aria-label={t("roadmap.aria")}>
        <ContentCard className="overflow-hidden p-0">
          <div className="border-b border-slate-200 px-5 py-4">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-pathwise-accent-strong">{t("roadmap.graph")}</p>
            <p className="mt-1 text-sm text-pathwise-muted">{t("roadmap.tap")}</p>
          </div>
          <div className="relative min-h-[30rem] overflow-hidden bg-white p-4 sm:p-6">
            <div className="pointer-events-none absolute inset-0 z-0 opacity-70 [background-image:radial-gradient(circle_at_1px_1px,rgb(100_116_139_/_0.16)_1px,transparent_0)] [background-size:24px_24px]" />
            <svg className="pointer-events-none absolute inset-0 z-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
              <path
                d="M9 68 C18 18, 31 26, 43 61 S55 81, 61 28 S75 17, 78 56 S88 70, 92 31"
                fill="none"
                stroke="rgb(108 99 255 / 0.22)"
                strokeWidth="1.1"
                strokeLinecap="round"
              />
              <path
                d="M9 68 C18 18, 31 26, 43 61 S55 81, 61 28 S75 17, 78 56 S88 70, 92 31"
                fill="none"
                stroke="rgb(108 99 255 / 0.9)"
                strokeWidth="0.42"
                strokeDasharray="2 2"
                strokeLinecap="round"
              />
            </svg>

            <div className="relative z-10 h-[30rem]">
              {nodes.map((node, index) => {
                const tone = TONE[node.tone];
                const isActive = node.id === active.id;
                return (
                  <button
                    key={node.id}
                    type="button"
                    onClick={() => setActiveId(node.id)}
                    className="group absolute z-10 min-h-12 min-w-12 -translate-x-1/2 -translate-y-1/2 rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#6C63FF]"
                    style={{ left: `${node.x}%`, top: `${node.y}%` }}
                    aria-pressed={isActive}
                    aria-label={`${node.title}: ${node.subtitle}`}
                  >
                    <span
                      className={`block rounded-full border-4 border-white shadow-[0_18px_38px_rgb(15_23_42_/_0.16)] transition-all duration-300 ${
                        isActive ? "h-20 w-20 scale-105" : "h-16 w-16 group-hover:scale-105"
                      }`}
                      style={{ backgroundColor: tone.fill, boxShadow: isActive ? `0 18px 50px ${tone.fill}33` : undefined }}
                    >
                      <span className="flex h-full w-full items-center justify-center text-lg font-black text-white">
                        {index + 1}
                      </span>
                    </span>
                    <span className="absolute left-1/2 top-full mt-2 hidden w-36 -translate-x-1/2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-center text-[11px] font-bold leading-tight text-pathwise-ink shadow-sm sm:block">
                      {node.title}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </ContentCard>

        <div className="grid gap-5">
          <ContentCard>
            <div className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${TONE[active.tone].soft} ${TONE[active.tone].text}`}>
              {active.phase}
            </div>
            <h2 className="mt-4 text-2xl font-black tracking-[-0.03em] text-pathwise-ink">{active.title}</h2>
            <p className="mt-1 text-sm font-semibold text-pathwise-accent-strong">{active.subtitle}</p>
            <p className="mt-4 text-sm leading-7 text-pathwise-muted">{active.detail}</p>
            <div className="mt-5">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-pathwise-muted">{active.metric}</p>
              <ProgressRail value={Math.min(100, score + nodes.findIndex((node) => node.id === active.id) * 4)} tone={active.tone} />
            </div>
          </ContentCard>

          <ContentCard>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-pathwise-muted">{t("roadmap.next")}</p>
            <div className="mt-4 grid gap-3">
              {active.actions.map((action, index) => (
                <div key={action} className="flex gap-3 rounded-2xl border border-slate-200 bg-white p-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#6C63FF]/10 text-xs font-black text-[#5B54D8]">
                    {index + 1}
                  </span>
                  <p className="text-sm font-semibold text-pathwise-ink">{action}</p>
                </div>
              ))}
            </div>
          </ContentCard>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {nodes.slice(1, 4).map((node) => (
          <button
            key={node.id}
            type="button"
            onClick={() => setActiveId(node.id)}
            className="pw-card min-h-32 p-5 text-left transition hover:-translate-y-0.5 hover:shadow-[0_18px_45px_rgb(15_23_42_/_0.1)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6C63FF]"
          >
            <span className={`rounded-full px-3 py-1 text-[11px] font-bold ${TONE[node.tone].soft} ${TONE[node.tone].text}`}>
              {node.phase}
            </span>
            <h3 className="mt-4 text-lg font-black tracking-[-0.03em] text-pathwise-ink">{node.title}</h3>
            <p className="mt-2 line-clamp-2 text-sm text-pathwise-muted">{node.subtitle}</p>
          </button>
        ))}
      </section>
    </div>
  );
}

function HeroMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-pathwise-muted">{label}</p>
      <p className="mt-1 line-clamp-2 text-sm font-black text-pathwise-ink">{value}</p>
    </div>
  );
}

function ProgressRail({ value, tone }: { value: number; tone: RoadmapNode["tone"] }) {
  return (
    <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-100" aria-label={`Progress ${value}%`}>
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{ width: `${value}%`, backgroundColor: TONE[tone].fill }}
      />
    </div>
  );
}
