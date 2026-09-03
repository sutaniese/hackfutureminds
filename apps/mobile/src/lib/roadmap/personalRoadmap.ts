import { ONBOARDING_SUBJECT_OPTIONS } from "../onboarding-constants";
import { BASE_TOPICS, subjectTitle } from "../learning/catalog";
import {
  isOlympiadGoal,
  isSchoolCatchupGoal,
  isUniversityGrantGoal,
  resolveActiveLearningGoal,
} from "../learning/goal-priority";
import type { DiagnosticResult, LearningProfile } from "../learning/store";
import type { LearningGoalId } from "../learning/types";
import type { Locale } from "../../i18n/locales";
import { tFor } from "../../i18n/messageTable";
import type { TargetUniversity } from "../../portal/lib/targetUniversity";
import type { GenerateResponse } from "../../types/generate";
import type { OnboardingAnswers, WorkPreference } from "../../types/onboarding";

export type RoadmapNode = {
  id: string;
  title: string;
  subtitle: string;
  phase: string;
  detail: string;
  actions: string[];
  metric: string;
  x: number;
  y: number;
  tone: "purple" | "green" | "red" | "slate";
};

export type RoadmapTrack = {
  id: string;
  label: string;
  profession: string;
  programs: string;
  proof: string;
};

function L(locale: Locale, key: string, params?: Record<string, string | number>): string {
  return tFor(locale, key, params);
}

const SUBJECT_KEYS: Record<string, string> = {
  math: "onboard.subjects.math",
  physics: "onboard.subjects.physics",
  chemistry: "onboard.subjects.chemistry",
  biology: "onboard.subjects.biology",
  history: "onboard.subjects.history",
  english: "onboard.subjects.english",
  kazakh: "onboard.subjects.kazakh",
  russian: "onboard.subjects.russian",
  cs: "onboard.subjects.cs",
  literature: "onboard.subjects.literature",
  geography: "onboard.subjects.geography",
  informatics: "onboard.subjects.cs",
};

export function subjectListLocalized(locale: Locale, ids: string[]): string {
  if (!ids.length) return L(locale, "roadmap.subject.none");
  return ids
    .map((id) => {
      const key = SUBJECT_KEYS[id];
      if (key) return L(locale, key);
      return ONBOARDING_SUBJECT_OPTIONS.find((item) => item.id === id)?.label ?? id;
    })
    .join(", ");
}

function workStyleLabel(locale: Locale, style: WorkPreference | null | undefined): string {
  if (style === "people") return L(locale, "roadmap.work.people");
  if (style === "data") return L(locale, "roadmap.work.data");
  if (style === "hands") return L(locale, "roadmap.work.hands");
  if (style === "ideas") return L(locale, "roadmap.work.ideas");
  return L(locale, "roadmap.work.mixed");
}

export function goalTitleFor(locale: Locale, goal: LearningGoalId | null): string {
  if (!goal) return L(locale, "goal.unset");
  return L(locale, `goal.${goal}`);
}

export function inferTrack(
  answers: OnboardingAnswers | null,
  diagnostic: DiagnosticResult | null,
  generated: GenerateResponse | null,
  locale: Locale = "ru",
  goal: LearningGoalId | null = null,
): RoadmapTrack {
  const diagSubjectId = diagnostic?.subjectId;
  const diagSubject = diagSubjectId
    ? subjectTitle(diagSubjectId)
    : answers?.subjectIds[0]
      ? subjectListLocalized(locale, answers.subjectIds.slice(0, 1))
      : L(locale, "roadmap.subject.none");

  if (isOlympiadGoal(goal)) {
    return {
      id: "olympiad",
      label: L(locale, "roadmap.track.olympiad", { subject: diagSubject }),
      profession: L(locale, "roadmap.track.olympiad.role", { subject: diagSubject }),
      programs: L(locale, "roadmap.track.olympiad.programs"),
      proof: L(locale, "roadmap.track.olympiad.proof"),
    };
  }

  if (isSchoolCatchupGoal(goal)) {
    return {
      id: "school",
      label: L(locale, "roadmap.track.school", { subject: diagSubject }),
      profession: L(locale, "roadmap.track.school.role"),
      programs: L(locale, "roadmap.track.school.programs"),
      proof: L(locale, "roadmap.track.school.proof"),
    };
  }

  const career = generated?.career_map[0]?.title?.trim();
  const subjects = new Set(answers?.subjectIds ?? []);
  const blob = [
    ...(answers?.subjectIds ?? []),
    answers?.freeTime ?? "",
    answers?.achievements ?? "",
    diagnostic?.subjectId ?? "",
    career ?? "",
  ]
    .join(" ")
    .toLowerCase();

  if (subjects.has("biology") || subjects.has("chemistry") || /bio|мед|health|врач|chem/.test(blob)) {
    return {
      id: "bio",
      label: L(locale, "roadmap.track.bio"),
      profession: career || L(locale, "roadmap.track.bio.role"),
      programs: L(locale, "roadmap.track.bio.programs"),
      proof: L(locale, "roadmap.track.bio.proof"),
    };
  }
  if (
    subjects.has("cs") ||
    diagnostic?.subjectId === "informatics" ||
    /code|python|data|ии|информат/.test(blob)
  ) {
    return {
      id: "cs",
      label: L(locale, "roadmap.track.cs"),
      profession: career || L(locale, "roadmap.track.cs.role"),
      programs: L(locale, "roadmap.track.cs.programs"),
      proof: L(locale, "roadmap.track.cs.proof"),
    };
  }
  if (
    subjects.has("math") ||
    subjects.has("physics") ||
    diagnostic?.subjectId === "math" ||
    diagnostic?.subjectId === "physics"
  ) {
    return {
      id: "stem",
      label: L(locale, "roadmap.track.stem"),
      profession: career || L(locale, "roadmap.track.stem.role"),
      programs: L(locale, "roadmap.track.stem.programs"),
      proof: L(locale, "roadmap.track.stem.proof"),
    };
  }
  if (subjects.has("history") || subjects.has("geography") || /law|policy|debate|дипломат/.test(blob)) {
    return {
      id: "policy",
      label: L(locale, "roadmap.track.policy"),
      profession: career || L(locale, "roadmap.track.policy.role"),
      programs: L(locale, "roadmap.track.policy.programs"),
      proof: L(locale, "roadmap.track.policy.proof"),
    };
  }
  return {
    id: "general",
    label: career ? L(locale, "roadmap.track.named", { career }) : L(locale, "roadmap.track.general"),
    profession: career || L(locale, "roadmap.track.general.role"),
    programs: L(locale, "roadmap.track.general.programs"),
    proof: L(locale, "roadmap.track.general.proof"),
  };
}

function weakTopicTitles(diagnostic: DiagnosticResult | null): string[] {
  if (!diagnostic) return [];
  return Object.entries(diagnostic.byTopic)
    .filter(([, score]) => score.total > 0 && score.correct / score.total < 0.7)
    .sort((a, b) => a[1].correct / a[1].total - b[1].correct / b[1].total)
    .map(([id]) => BASE_TOPICS.find((topic) => topic.id === id)?.title ?? id)
    .slice(0, 3);
}

function levelLabel(locale: Locale, level: 1 | 2 | 3 | 4): string {
  return L(locale, `level.${level}`);
}

function node(
  partial: Omit<RoadmapNode, "x" | "y" | "tone"> & { x: number; y: number; tone: RoadmapNode["tone"] },
): RoadmapNode {
  return partial;
}

export function buildPersonalRoadmap(input: {
  answers: OnboardingAnswers | null;
  diagnostic: DiagnosticResult | null;
  profile: LearningProfile | null;
  generated: GenerateResponse | null;
  targetUniversity: TargetUniversity | null;
  locale?: Locale;
}): RoadmapNode[] {
  const locale = input.locale ?? "ru";
  const { answers, diagnostic, profile, generated, targetUniversity } = input;
  const goal = resolveActiveLearningGoal(profile, answers);
  const track = inferTrack(answers, diagnostic, generated, locale, goal);
  const city = answers?.city.trim() || targetUniversity?.city || L(locale, "roadmap.kz");
  const weak = weakTopicTitles(diagnostic);
  const accuracy = diagnostic
    ? Math.round((diagnostic.correct / Math.max(1, diagnostic.total)) * 100)
    : null;
  const exam = profile?.examDate;
  const diagSubject = diagnostic ? subjectTitle(diagnostic.subjectId) : null;
  const grade = profile?.grade ?? diagnostic?.grade;
  const level = diagnostic ? levelLabel(locale, diagnostic.level) : null;
  const style = workStyleLabel(locale, answers?.workPreference ?? null);
  const subjects = subjectListLocalized(
    locale,
    answers?.subjectIds?.length
      ? answers.subjectIds
      : diagnostic?.subjectId
        ? [diagnostic.subjectId]
        : [],
  );
  const goalLabel = goalTitleFor(locale, goal);
  const weakJoin = weak.join(", ");

  const gapsSubtitle = level
    ? L(locale, "roadmap.gaps.sub.ready", {
        subject: diagSubject ?? "",
        grade: grade ?? "—",
        level,
        extra: accuracy != null ? ` · ${accuracy}%` : "",
      })
    : L(locale, "roadmap.gaps.sub.empty");

  const gapsDetail = weak.length
    ? L(locale, "roadmap.gaps.detail.weak", { topics: weakJoin })
    : diagnostic
      ? L(locale, "roadmap.gaps.detail.ok")
      : L(locale, "roadmap.gaps.detail.none");

  const gapsActions = weak.length
    ? weak.map((title) => L(locale, "roadmap.gaps.action.topic", { title }))
    : diagnostic
      ? [
          L(locale, "roadmap.gaps.action.continue", { subject: diagSubject ?? "", level: level ?? "" }),
          L(locale, "roadmap.gaps.action.daily"),
        ]
      : [L(locale, "roadmap.gaps.action.open"), L(locale, "roadmap.gaps.action.take")];

  if (isOlympiadGoal(goal)) {
    return [
      node({
        id: "vision",
        title: L(locale, "roadmap.olympiad.1.title"),
        subtitle: track.label,
        phase: L(locale, "roadmap.phase.now"),
        detail: L(locale, "roadmap.olympiad.1.detail", {
          subject: diagSubject ?? subjects,
          goal: goalLabel,
          style,
        }),
        actions: [
          L(locale, "roadmap.olympiad.1.a1", { subject: diagSubject ?? subjects }),
          L(locale, "roadmap.olympiad.1.a2"),
          L(locale, "roadmap.olympiad.1.a3"),
        ],
        metric: L(locale, "roadmap.olympiad.1.metric"),
        x: 9,
        y: 68,
        tone: "purple",
      }),
      node({
        id: "gaps",
        title: L(locale, "roadmap.olympiad.2.title"),
        subtitle: gapsSubtitle,
        phase: L(locale, "roadmap.phase.2to6"),
        detail: gapsDetail,
        actions: gapsActions,
        metric: L(locale, "roadmap.gaps.metric"),
        x: 25,
        y: 34,
        tone: "red",
      }),
      node({
        id: "skills",
        title: L(locale, "roadmap.olympiad.3.title"),
        subtitle: track.proof,
        phase: L(locale, "roadmap.phase.1to3m"),
        detail: L(locale, "roadmap.olympiad.3.detail", { subject: diagSubject ?? subjects }),
        actions: [
          L(locale, "roadmap.olympiad.3.a1"),
          L(locale, "roadmap.olympiad.3.a2"),
          L(locale, "roadmap.olympiad.3.a3"),
        ],
        metric: L(locale, "roadmap.olympiad.3.metric"),
        x: 43,
        y: 61,
        tone: "green",
      }),
      node({
        id: "programs",
        title: L(locale, "roadmap.olympiad.4.title"),
        subtitle: L(locale, "roadmap.olympiad.4.sub"),
        phase: L(locale, "roadmap.phase.3to5m"),
        detail: L(locale, "roadmap.olympiad.4.detail"),
        actions: [
          L(locale, "roadmap.olympiad.4.a1"),
          L(locale, "roadmap.olympiad.4.a2"),
          L(locale, "roadmap.olympiad.4.a3"),
        ],
        metric: L(locale, "roadmap.olympiad.4.metric"),
        x: 61,
        y: 28,
        tone: "purple",
      }),
      node({
        id: "grants",
        title: L(locale, "roadmap.olympiad.5.title"),
        subtitle: L(locale, "roadmap.olympiad.5.sub"),
        phase: L(locale, "roadmap.phase.5to7m"),
        detail: L(locale, "roadmap.olympiad.5.detail"),
        actions: [
          L(locale, "roadmap.olympiad.5.a1"),
          L(locale, "roadmap.olympiad.5.a2"),
          L(locale, "roadmap.olympiad.5.a3"),
        ],
        metric: L(locale, "roadmap.olympiad.5.metric"),
        x: 78,
        y: 56,
        tone: "red",
      }),
      node({
        id: "launch",
        title: L(locale, "roadmap.olympiad.6.title"),
        subtitle: exam ? L(locale, "roadmap.date.by", { date: exam }) : L(locale, "roadmap.olympiad.6.sub"),
        phase: L(locale, "roadmap.phase.contest"),
        detail: L(locale, "roadmap.olympiad.6.detail", { subject: diagSubject ?? subjects }),
        actions: [
          L(locale, "roadmap.olympiad.6.a1"),
          L(locale, "roadmap.olympiad.6.a2"),
          L(locale, "roadmap.olympiad.6.a3"),
        ],
        metric: L(locale, "roadmap.olympiad.6.metric"),
        x: 92,
        y: 31,
        tone: "slate",
      }),
    ];
  }

  if (isSchoolCatchupGoal(goal)) {
    return [
      node({
        id: "vision",
        title: L(locale, "roadmap.school.1.title"),
        subtitle: track.label,
        phase: L(locale, "roadmap.phase.now"),
        detail: L(locale, "roadmap.school.1.detail", {
          subject: diagSubject ?? subjects,
          goal: goalLabel,
        }),
        actions: [
          L(locale, "roadmap.school.1.a1"),
          L(locale, "roadmap.school.1.a2"),
          L(locale, "roadmap.school.1.a3"),
        ],
        metric: L(locale, "roadmap.school.1.metric"),
        x: 9,
        y: 68,
        tone: "purple",
      }),
      node({
        id: "gaps",
        title: L(locale, "roadmap.school.2.title"),
        subtitle: gapsSubtitle,
        phase: L(locale, "roadmap.phase.2to6"),
        detail: gapsDetail,
        actions: gapsActions,
        metric: L(locale, "roadmap.gaps.metric"),
        x: 25,
        y: 34,
        tone: "red",
      }),
      node({
        id: "skills",
        title: L(locale, "roadmap.school.3.title"),
        subtitle: L(locale, "roadmap.school.3.sub"),
        phase: L(locale, "roadmap.phase.1to3m"),
        detail: L(locale, "roadmap.school.3.detail"),
        actions: [
          L(locale, "roadmap.school.3.a1"),
          L(locale, "roadmap.school.3.a2"),
          L(locale, "roadmap.school.3.a3"),
        ],
        metric: L(locale, "roadmap.school.3.metric"),
        x: 43,
        y: 61,
        tone: "green",
      }),
      node({
        id: "programs",
        title: L(locale, "roadmap.school.4.title"),
        subtitle: L(locale, "roadmap.school.4.sub"),
        phase: L(locale, "roadmap.phase.3to5m"),
        detail: L(locale, "roadmap.school.4.detail"),
        actions: [
          L(locale, "roadmap.school.4.a1"),
          L(locale, "roadmap.school.4.a2"),
          L(locale, "roadmap.school.4.a3"),
        ],
        metric: L(locale, "roadmap.school.4.metric"),
        x: 61,
        y: 28,
        tone: "purple",
      }),
      node({
        id: "grants",
        title: L(locale, "roadmap.school.5.title"),
        subtitle: L(locale, "roadmap.school.5.sub"),
        phase: L(locale, "roadmap.phase.5to7m"),
        detail: L(locale, "roadmap.school.5.detail"),
        actions: [
          L(locale, "roadmap.school.5.a1"),
          L(locale, "roadmap.school.5.a2"),
          L(locale, "roadmap.school.5.a3"),
        ],
        metric: L(locale, "roadmap.school.5.metric"),
        x: 78,
        y: 56,
        tone: "red",
      }),
      node({
        id: "launch",
        title: L(locale, "roadmap.school.6.title"),
        subtitle: exam ? L(locale, "roadmap.date.by", { date: exam }) : L(locale, "roadmap.school.6.sub"),
        phase: L(locale, "roadmap.phase.term"),
        detail: L(locale, "roadmap.school.6.detail"),
        actions: [
          L(locale, "roadmap.school.6.a1"),
          L(locale, "roadmap.school.6.a2"),
          L(locale, "roadmap.school.6.a3"),
        ],
        metric: L(locale, "roadmap.school.6.metric"),
        x: 92,
        y: 31,
        tone: "slate",
      }),
    ];
  }

  const place =
    answers?.studyLocation === "abroad" || goal === "abroad"
      ? L(locale, "roadmap.place.abroad")
      : L(locale, "roadmap.place.kz");
  const budget = answers?.budgetConstraints.trim() || L(locale, "roadmap.budget.default");
  const achievement = answers?.achievements.trim() || L(locale, "roadmap.achievement.default");
  const uni =
    targetUniversity?.name ||
    (answers?.studyLocation === "abroad" || goal === "abroad"
      ? L(locale, "roadmap.uni.abroad")
      : L(locale, "roadmap.uni.city", { city }));
  const grant = isUniversityGrantGoal(goal) ? generated?.financial_route.grants[0] : undefined;

  return [
    node({
      id: "vision",
      title: L(locale, "roadmap.ent.1.title"),
      subtitle: track.label,
      phase: L(locale, "roadmap.phase.now"),
      detail: L(locale, "roadmap.ent.1.detail", {
        track: track.label,
        subjects,
        style,
        role: track.profession,
        goal: goalLabel,
      }),
      actions: [
        L(locale, "roadmap.ent.1.a1", { track: track.label }),
        L(locale, "roadmap.ent.1.a2", { programs: track.programs }),
        L(locale, "roadmap.ent.1.a3"),
      ],
      metric: L(locale, "roadmap.ent.1.metric"),
      x: 9,
      y: 68,
      tone: "purple",
    }),
    node({
      id: "gaps",
      title: L(locale, "roadmap.ent.2.title"),
      subtitle: gapsSubtitle,
      phase: L(locale, "roadmap.phase.2to6"),
      detail: gapsDetail,
      actions: gapsActions,
      metric: L(locale, "roadmap.gaps.metric"),
      x: 25,
      y: 34,
      tone: "red",
    }),
    node({
      id: "skills",
      title: L(locale, "roadmap.ent.3.title"),
      subtitle: track.proof,
      phase: L(locale, "roadmap.phase.1to3m"),
      detail: L(locale, "roadmap.ent.3.detail", { achievement, goal: goalLabel }),
      actions: [
        L(locale, "roadmap.ent.3.a1", { track: track.label }),
        L(locale, "roadmap.ent.3.a2"),
        L(locale, "roadmap.ent.3.a3"),
      ],
      metric: L(locale, "roadmap.ent.3.metric"),
      x: 43,
      y: 61,
      tone: "green",
    }),
    node({
      id: "programs",
      title: L(locale, "roadmap.ent.4.title"),
      subtitle: uni,
      phase: L(locale, "roadmap.phase.3to5m"),
      detail: L(locale, "roadmap.ent.4.detail", {
        programs: track.programs,
        city,
        place,
        subjects,
      }),
      actions: [
        L(locale, "roadmap.ent.4.a1", { uni }),
        L(locale, "roadmap.ent.4.a2"),
        L(locale, "roadmap.ent.4.a3") + (exam ? ` (${exam})` : ""),
      ],
      metric: L(locale, "roadmap.ent.4.metric"),
      x: 61,
      y: 28,
      tone: "purple",
    }),
    node({
      id: "grants",
      title: L(locale, "roadmap.ent.5.title"),
      subtitle: grant ? `${grant.name} · ${grant.deadline}` : budget,
      phase: L(locale, "roadmap.phase.5to7m"),
      detail: grant
        ? L(locale, "roadmap.ent.5.detail.grant", {
            name: grant.name,
            deadline: grant.deadline,
            coverage: generated?.financial_route.coverage_percent ?? 0,
          })
        : L(locale, "roadmap.ent.5.detail.budget", { budget, place }),
      actions: [
        L(locale, "roadmap.ent.5.a1"),
        L(locale, "roadmap.ent.5.a2"),
        L(locale, "roadmap.ent.5.a3"),
      ],
      metric: L(locale, "roadmap.ent.5.metric"),
      x: 78,
      y: 56,
      tone: "red",
    }),
    node({
      id: "launch",
      title: L(locale, "roadmap.ent.6.title"),
      subtitle: exam ? L(locale, "roadmap.date.by", { date: exam }) : L(locale, "roadmap.ent.6.sub"),
      phase: L(locale, "roadmap.phase.7to12m"),
      detail: L(locale, "roadmap.ent.6.detail", { role: track.profession, city }),
      actions: [
        L(locale, "roadmap.ent.6.a1"),
        L(locale, "roadmap.ent.6.a2"),
        L(locale, "roadmap.ent.6.a3"),
      ],
      metric: L(locale, "roadmap.ent.6.metric"),
      x: 92,
      y: 31,
      tone: "slate",
    }),
  ];
}

export function readinessScore(input: {
  answers: OnboardingAnswers | null;
  diagnostic: DiagnosticResult | null;
  generated: GenerateResponse | null;
  profile?: LearningProfile | null;
}): number {
  const { answers, diagnostic, generated, profile } = input;
  const goal = resolveActiveLearningGoal(profile ?? null, answers);
  if (!answers && !diagnostic && !profile) return 12;
  let score = 18;
  if (answers?.subjectIds.length) score += 10;
  if (answers?.freeTime.trim()) score += 6;
  if (answers?.achievements.trim()) score += 10;
  if (answers?.workPreference) score += 6;
  if (answers?.studyLocation) score += 6;
  if (answers?.city.trim()) score += 4;
  if (diagnostic) score += 18;
  if (profile?.goals.length) score += 12;
  if (isUniversityGrantGoal(goal) && generated?.career_map.length) score += 6;
  if (isUniversityGrantGoal(goal) && answers?.budgetConstraints.trim()) score += 4;
  return Math.min(100, score);
}
