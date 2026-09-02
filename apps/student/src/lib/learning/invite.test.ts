import { describe, expect, it } from "vitest";
import { generateInviteCode, isInviteCodeFormat, normalizeInviteCode } from "./invite";

describe("invite codes", () => {
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
