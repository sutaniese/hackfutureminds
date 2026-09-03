import { describe, expect, it } from "vitest";
import {
  canAccessUniversityLayer,
  filterNavLinksForGrade,
  goalsForGrade,
  nextOnboardingStepIndex,
  sanitizeGoalsForGrade,
} from "@pathwise/shared";

describe("canAccessUniversityLayer", () => {
  it("hides the layer for grades 7–9", () => {
    expect(canAccessUniversityLayer(7)).toBe(false);
    expect(canAccessUniversityLayer(8)).toBe(false);
    expect(canAccessUniversityLayer(9)).toBe(false);
  });

  it("keeps the layer for grades 10–12 and unknown grade", () => {
    expect(canAccessUniversityLayer(10)).toBe(true);
    expect(canAccessUniversityLayer(11)).toBe(true);
    expect(canAccessUniversityLayer(12)).toBe(true);
    expect(canAccessUniversityLayer(null)).toBe(true);
  });
});

describe("goals and nav for grade", () => {
  it("drops ENT and abroad goals for grades 7–9", () => {
    const goals = goalsForGrade(
      [{ id: "ent" }, { id: "olympiad" }, { id: "abroad" }, { id: "school" }],
      8,
    );
    expect(goals.map((item) => item.id)).toEqual(["olympiad", "school"]);
    expect(sanitizeGoalsForGrade(["ent", "abroad"], 8)).toEqual(["school"]);
    expect(sanitizeGoalsForGrade(["ent", "olympiad"], 8)).toEqual(["olympiad"]);
  });

  it("leaves 10–12 goals and nav unchanged", () => {
    const goals = goalsForGrade([{ id: "ent" }, { id: "school" }], 11);
    expect(goals.map((item) => item.id)).toEqual(["ent", "school"]);
    expect(
      filterNavLinksForGrade(
        [{ href: "/learning" }, { href: "/grants" }, { href: "/hub/vuzy" }],
        11,
      ),
    ).toHaveLength(3);
  });

  it("removes grants and universities from student nav for 7–9", () => {
    expect(
      filterNavLinksForGrade(
        [{ href: "/learning" }, { href: "/grants" }, { href: "/hub/vuzy" }, { href: "/portfolio" }],
        8,
      ).map((item) => item.href),
    ).toEqual(["/learning", "/portfolio"]);
  });

  it("skips university onboarding questions for 7–9", () => {
    expect(nextOnboardingStepIndex(3, 8, 1)).toBe(5);
    expect(nextOnboardingStepIndex(5, 8, 1)).toBe(7);
    expect(nextOnboardingStepIndex(5, 8, -1)).toBe(3);
    expect(nextOnboardingStepIndex(3, 11, 1)).toBe(4);
  });
});
