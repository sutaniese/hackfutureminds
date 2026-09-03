export type StudentHomeworkItem = {
  id: string;
  title: string;
  summary: string;
  author?: string;
  status: "assigned" | "in_progress" | "done";
  hasClip?: boolean;
};

export type StudentExamItem = {
  title: string;
  date?: string;
  source: "profile" | "teacher";
};

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
