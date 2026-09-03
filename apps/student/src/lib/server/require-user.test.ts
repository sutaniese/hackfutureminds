import { describe, expect, it } from "vitest";
import { HttpError, requireRole, type AuthedUser } from "./require-user";
import { joinFailureMessage, publicErrorMessage } from "./public-error";
import { asArray } from "@/lib/safe-list";

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

describe("public join/auth errors", () => {
  it("never surfaces the accessToken/getClaims supabase-js string", () => {
    expect(
      publicErrorMessage(
        new Error("@supabase/supabase-js: Supabase Client is configured with the accessToken option, accessing supabase.auth.getClaims is not possible"),
        "Войдите в аккаунт.",
      ),
    ).toBe("Войдите в аккаунт.");
    expect(joinFailureMessage("class not found").message).toBe("Неверный код класса.");
    expect(joinFailureMessage("already a member").message).toBe("Вы уже в этом классе.");
    expect(asArray(undefined)).toEqual([]);
  });
});

