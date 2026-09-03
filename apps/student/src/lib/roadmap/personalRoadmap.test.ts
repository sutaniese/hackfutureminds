import { describe, expect, it } from "vitest";
import { buildPersonalRoadmap } from "./personalRoadmap";
import type { DiagnosticResult, LearningProfile } from "@/lib/learning/store";
import type { OnboardingAnswers } from "@/types/onboarding";

const onboarding: OnboardingAnswers = {
  subjectIds: ["biology"],
  freeTime: "",
  achievements: "",
  workPreference: "hands",
  studyLocation: "kazakhstan",
  city: "Астана",
  budgetConstraints: "нужен грант Bolashak",
};

const olympiadProfile: LearningProfile = {
  grade: 9,
  subjectId: "math",
  goals: ["olympiad"],
  examDate: "2026-03-15",
  minutesPerDay: 45,
  updatedAt: 1,
};

const diagnostic: DiagnosticResult = {
  subjectId: "math",
  grade: 9,
  level: 3,
  correct: 5,
  total: 8,
    byTopic: {
      "math-quadratic": { correct: 1, total: 3 },
    },
    bySkill: {},
    at: 1,
  };

describe("buildPersonalRoadmap", () => {
  it("builds an olympiad track without ЕНТ, Bolashak or university-grant copy", () => {
    const nodes = buildPersonalRoadmap({
      answers: onboarding,
      diagnostic,
      profile: olympiadProfile,
      generated: {
        career_map: [{ title: "Врач", salary_kzt: "1", description: "", vacancies: [] }],
        financial_route: {
          monthly_cost: 1,
          grants: [{ name: "Bolashak", amount: 1, deadline: "май", match: "high" }],
          gap: 0,
          coverage_percent: 80,
        },
        portfolio_block: "",
      },
      targetUniversity: { id: "nu", name: "NU", city: "Астана" },
      locale: "ru",
    });
    const blob = JSON.stringify(nodes);
    expect(blob).toMatch(/олимпиад/i);
    expect(blob).not.toMatch(/ЕНТ/);
    expect(blob).not.toMatch(/Bolashak/i);
    expect(blob).not.toMatch(/вуз/i);
    expect(blob).not.toMatch(/грант/i);
    expect(nodes[0]?.subtitle).toMatch(/олимпиад/i);
  });

  it("keeps ЕНТ copy when that is the diagnostic goal", () => {
    const nodes = buildPersonalRoadmap({
      answers: onboarding,
      diagnostic,
      profile: { ...olympiadProfile, goals: ["ent"] },
      generated: null,
      targetUniversity: null,
      locale: "ru",
    });
    const blob = JSON.stringify(nodes);
    expect(blob).toMatch(/ЕНТ|вуз|грант/i);
  });
});
