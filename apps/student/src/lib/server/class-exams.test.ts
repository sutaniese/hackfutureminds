import { describe, expect, it } from "vitest";
import { mergeClassExams } from "@/lib/learning/class-overview";

describe("mergeClassExams", () => {
  it("includes the student's own exam date and teacher-published deadlines", () => {
    expect(
      mergeClassExams("2026-03-15", [
        { title: "Контрольная", due_on: "2026-03-01" },
      ]),
    ).toEqual([
      { title: "2026-03-15", date: "2026-03-15", source: "profile" },
      { title: "Контрольная", date: "2026-03-01", source: "teacher" },
    ]);
  });

  it("returns an empty list when nothing is set", () => {
    expect(mergeClassExams(undefined, [])).toEqual([]);
  });
});
