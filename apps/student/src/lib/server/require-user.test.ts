import { describe, expect, it } from "vitest";
import { HttpError, requireRole, type AuthedUser } from "./require-user";

const student: AuthedUser = {
  id: "u1",
  email: "a@b.c",
  role: "student",
};

describe("requireRole", () => {
  it("allows the matching role used by invite and progress writes", () => {
    expect(() => requireRole(student, "student")).not.toThrow();
  });

  it("rejects a teacher from student-only invite/progress paths", () => {
    expect(() => requireRole({ ...student, role: "teacher" }, "student")).toThrow(HttpError);
  });
});
