export type StudentHomeworkItem = {
  id: string;
  title: string;
  summary: string;
  author?: string;
  status: "assigned" | "in_progress" | "done";
};

export type StudentExamItem = {
  title: string;
  date?: string;
  source: "profile" | "teacher";
};

export function mergeClassExams(
  profileExamDate: string | undefined,
  teacherDeadlines: Array<{ title: string; due_on: string }>,
): StudentExamItem[] {
  const exams: StudentExamItem[] = [];
  if (profileExamDate) {
    exams.push({ title: profileExamDate, date: profileExamDate, source: "profile" });
  }
  for (const row of teacherDeadlines) {
    exams.push({ title: row.title, date: row.due_on, source: "teacher" });
  }
  return exams;
}

export type StudentClassOverview = {
  configured: boolean;
  class: {
    id: string;
    name: string;
    inviteCode: string;
    teacherName: string | null;
  } | null;
  memberCount: number;
  classmates: { displayName: string }[];
  homework: StudentHomeworkItem[];
  exams: StudentExamItem[];
};
