import { describe, expect, it } from "vitest";
import { resolveActiveLearningGoal } from "./goal-priority";
import type { OnboardingAnswers } from "@/types/onboarding";

const onboard = (partial: Partial<OnboardingAnswers> = {}): OnboardingAnswers => ({
  subjectIds: ["math"],
  freeTime: "",
  achievements: "",
  workPreference: null,
  studyLocation: "kazakhstan",
  city: "Алматы",
  budgetConstraints: "нужен грант",
  ...partial,
});

describe("resolveActiveLearningGoal", () => {
  it("lets the diagnostic olympiad goal beat an ENT-shaped анкета", () => {
    expect(
      resolveActiveLearningGoal({ goals: ["olympiad"] }, onboard({ studyLocation: "kazakhstan" })),
    ).toBe("olympiad");
  });

  it("prefers olympiad when several diagnostic goals are set", () => {
    expect(resolveActiveLearningGoal({ goals: ["school", "olympiad", "ent"] }, onboard())).toBe(
      "olympiad",
    );
  });

  it("does not invent ЕНТ from a Kazakhstan city when diagnostics are empty", () => {
    expect(resolveActiveLearningGoal(null, onboard())).toBeNull();
  });

  it("reads olympiad from onboarding achievements only when the profile has no goals", () => {
    expect(
      resolveActiveLearningGoal(null, onboard({ achievements: "призер олимпиады по математике" })),
    ).toBe("olympiad");
  });
});
