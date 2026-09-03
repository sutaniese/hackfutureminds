import { describe, expect, it } from "vitest";
import { generateInviteCode, isInviteCodeFormat, normalizeInviteCode } from "./invite";

describe("invite codes", () => {
  /**
   * Regression: after a teacher publishes a constructor topic, the student
   * who joined with this invite must see that topic via GET /api/learning/topics
   * and GET /api/learning/class homework — not only the baked catalog ids.
   * Mobile hydrates both endpoints in LearningContext; do not filter custom:true.
   */
  it("normalizes spacing and case", () => {
    expect(normalizeInviteCode(" tn-ab12cd ")).toBe("TN-AB12CD");
  });

  it("accepts TN-XXXXXX", () => {
    expect(isInviteCodeFormat("TN-AB12CD")).toBe(true);
    expect(isInviteCodeFormat("nope")).toBe(false);
  });

  it("does not collide with an existing code", () => {
    const first = generateInviteCode();
    const second = generateInviteCode([first]);
    expect(first).not.toBe(second);
    expect(isInviteCodeFormat(first)).toBe(true);
    expect(isInviteCodeFormat(second)).toBe(true);
  });
});
