import { describe, expect, it } from "vitest";
import { parseVoiceControlCommand, resolveVoicePath, commandPlainLanguage } from "./control-command";

describe("voice control whitelist", () => {
  it("accepts a diagnostics start command and rejects unknown actions", () => {
    const ok = parseVoiceControlCommand({
      action: "diagnostic",
      verb: "start",
      subjectId: "math",
      speak: "Открываю диагностику по математике.",
    });
    expect(ok?.action).toBe("diagnostic");
    expect(parseVoiceControlCommand({ action: "eval", code: "alert(1)", speak: "x" })).toBeNull();
  });

  it("blocks universities for grades 7–9 and teacher routes for students", () => {
    const uni = parseVoiceControlCommand({
      action: "navigate",
      target: "universities",
      speak: "Открываю вузы.",
    });
    expect(uni).not.toBeNull();
    if (uni) {
      expect(resolveVoicePath(uni, { role: "student", grade: 8, userRole: "student" }).blocked).toMatch(/10/);
      expect(resolveVoicePath(uni, { role: "student", grade: 11, userRole: "student" }).path).toBe("/hub/vuzy");
    }
    const students = parseVoiceControlCommand({
      action: "navigate",
      target: "students",
      speak: "Открываю учеников.",
    });
    if (students) {
      expect(resolveVoicePath(students, { role: "student", grade: 11, userRole: "student" }).blocked).toBeTruthy();
      expect(resolveVoicePath(students, { role: "teacher", grade: 11, userRole: "teacher" }).path).toBe("/hub/uchenik");
    }
  });

  it("turns a learning navigate into plain language", () => {
    const cmd = parseVoiceControlCommand({
      action: "navigate",
      target: "learning",
      speak: "Открываю обучение",
    });
    expect(cmd && commandPlainLanguage(cmd)).toBe("Открываю обучение");
  });
});
