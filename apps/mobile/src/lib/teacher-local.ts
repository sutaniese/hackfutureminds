import { generateInviteCode, normalizeInviteCode } from "./learning/invite";
import { saveCustomTopic } from "./learning/store";
import { readJson, writeJson } from "./storage";
import type { Topic } from "./learning/types";

const CLASSES_KEY = "ten-teacher-classes";

export type LocalTeacherClass = {
  id: string;
  name: string;
  inviteCode: string;
  studentIds: string[];
  createdAt: string;
  teacherName?: string;
};

export function readLocalClasses(): LocalTeacherClass[] {
  return readJson<LocalTeacherClass[]>(CLASSES_KEY, []);
}

export function createLocalClass(name: string, teacherName?: string): LocalTeacherClass {
  const existing = readLocalClasses();
  const created: LocalTeacherClass = {
    id: `local-${Date.now()}`,
    name: name.trim() || "11«Б»",
    inviteCode: generateInviteCode(existing.map((item) => item.inviteCode)),
    studentIds: [],
    createdAt: new Date().toISOString(),
    teacherName,
  };
  writeJson(CLASSES_KEY, [created, ...existing]);
  return created;
}

export function deleteLocalClass(id: string): LocalTeacherClass[] {
  const next = readLocalClasses().filter((item) => item.id !== id);
  writeJson(CLASSES_KEY, next);
  return next;
}

export function findLocalClassByInvite(code: string): LocalTeacherClass | null {
  const normalized = normalizeInviteCode(code);
  return readLocalClasses().find((item) => item.inviteCode === normalized) ?? null;
}

export function addLocalStudent(classId: string, email: string): void {
  const classes = readLocalClasses();
  writeJson(
    CLASSES_KEY,
    classes.map((item) =>
      item.id === classId && !item.studentIds.includes(email)
        ? { ...item, studentIds: [...item.studentIds, email] }
        : item,
    ),
  );
}

export type LocalPublishedTopic = Topic & { classId?: string };

export function publishLocalTopic(classId: string, topic: Topic): Topic {
  const next = { ...topic, custom: true, author: "teacher" };
  saveCustomTopic(next);
  writeJson(`ten-class-topics::${classId}`, [
    ...readJson<Topic[]>(`ten-class-topics::${classId}`, []),
    next,
  ]);
  return next;
}

export function readClassTopics(classId: string): Topic[] {
  return readJson<Topic[]>(`ten-class-topics::${classId}`, []);
}
