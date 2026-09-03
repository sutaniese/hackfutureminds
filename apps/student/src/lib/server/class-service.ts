import { generateInviteCode } from "@/lib/learning/invite";
import { snapshotFromProgress } from "@/lib/learning/snapshot";
import { BASE_TOPICS, findTask, findTopic } from "@/lib/learning/catalog";
import { EMPTY_STATE } from "@/lib/learning/empty-state";
import { isTopicComplete, topicStateOf } from "@/lib/learning/recommend";
import type { LearningProfile, LearningState } from "@/lib/learning/store";
import type { Topic } from "@/lib/learning/types";
import type {
  StudentClassOverview,
  StudentExamItem,
  StudentHomeworkItem,
} from "@/lib/learning/class-overview";
import { mergeClassExams } from "@/lib/learning/class-overview";
import { createServerSupabase } from "@/lib/supabase/server";
import { requireRole, type AuthedUser } from "@/lib/server/require-user";
import { HttpError } from "@/lib/server/require-user";
import { joinFailureMessage, publicErrorMessage } from "@/lib/server/public-error";
import { asArray } from "@/lib/safe-list";

export type { StudentClassOverview, StudentExamItem, StudentHomeworkItem };
function topicFromCustomRow(row: {
  topic?: Topic | null;
  clip_script?: Topic["clipScript"];
  notes?: Topic["notes"];
}): Topic | null {
  if (!row.topic) return null;
  return {
    ...row.topic,
    clipScript: row.topic.clipScript ?? row.clip_script ?? null,
    notes: row.topic.notes ?? row.notes ?? null,
  };
}

export type ClassRow = {
  id: string;
  name: string;
  inviteCode: string;
  studentIds: string[];
  createdAt: string;
  teacherId: string;
};

type ClassRecord = {
  id: string;
  name: string;
  invite_code: string;
  teacher_id: string;
  created_at: string;
};

export async function listClassesForUser(user: AuthedUser): Promise<ClassRow[]> {
  void user;
  const supabase = await createServerSupabase();
  if (!supabase) throw new HttpError(503, "Supabase is not configured.");

  const { data, error } = await supabase
    .from("classes")
    .select("id, name, invite_code, teacher_id, created_at")
    .order("created_at", { ascending: true });
  if (error) throw new HttpError(500, publicErrorMessage(error, "Не удалось загрузить классы."));
  const classes = (data ?? []) as ClassRecord[];
  if (classes.length === 0) return [];

  const ids = classes.map((c) => c.id);
  const { data: members, error: memberError } = await supabase
    .from("class_members")
    .select("class_id, student_id")
    .in("class_id", ids);
  if (memberError) throw new HttpError(500, publicErrorMessage(memberError, "Не удалось загрузить классы."));

  const byClass = new Map<string, string[]>();
  for (const row of members ?? []) {
    const list = byClass.get(row.class_id) ?? [];
    list.push(row.student_id);
    byClass.set(row.class_id, list);
  }

  return classes.map((c) => ({
    id: c.id,
    name: c.name,
    inviteCode: c.invite_code,
    teacherId: c.teacher_id,
    createdAt: c.created_at,
    studentIds: byClass.get(c.id) ?? [],
  }));
}

export async function createClassForTeacher(user: AuthedUser, name: string): Promise<ClassRow> {
  requireRole(user, "teacher");
  const supabase = await createServerSupabase();
  if (!supabase) throw new HttpError(503, "Supabase is not configured.");

  const { data: existing } = await supabase.from("classes").select("invite_code");
  const code = generateInviteCode((existing ?? []).map((row: { invite_code: string }) => row.invite_code));

  const { data, error } = await supabase
    .from("classes")
    .insert({ teacher_id: user.id, name: name.trim() || "Класс", invite_code: code })
    .select("id, name, invite_code, teacher_id, created_at")
    .single();
  if (error) throw new HttpError(500, error.message);
  const c = data as ClassRecord;
  return {
    id: c.id,
    name: c.name,
    inviteCode: c.invite_code,
    teacherId: c.teacher_id,
    createdAt: c.created_at,
    studentIds: [],
  };
}

export async function deleteClassForTeacher(user: AuthedUser, classId: string): Promise<boolean> {
  requireRole(user, "teacher");
  const supabase = await createServerSupabase();
  if (!supabase) throw new HttpError(503, "Supabase is not configured.");
  const { error, count } = await supabase
    .from("classes")
    .delete({ count: "exact" })
    .eq("id", classId)
    .eq("teacher_id", user.id);
  if (error) throw new HttpError(500, publicErrorMessage(error, "Не удалось удалить класс."));
  return (count ?? 0) > 0;
}

export async function joinClassAsStudent(user: AuthedUser, inviteCode: string) {
  requireRole(user, "student");
  const supabase = await createServerSupabase();
  if (!supabase) throw new HttpError(503, "Supabase is not configured.");
  const { data, error } = await supabase.rpc("join_class_by_invite", { p_code: inviteCode });
  if (error) {
    const mapped = joinFailureMessage(error.message || "");
    throw new HttpError(mapped.status, mapped.message);
  }
  const classId = String(data);
  const { data: cls } = await supabase
    .from("classes")
    .select("id, name, invite_code")
    .eq("id", classId)
    .maybeSingle();
  return {
    classId,
    name: cls?.name ?? "",
    inviteCode: cls?.invite_code ?? inviteCode,
  };
}

function asProfile(row: {
  grade: number;
  subject_id: string;
  goals: unknown;
  exam_date: string | null;
  minutes_per_day: number;
  updated_at: string;
}): LearningProfile {
  return {
    grade: row.grade as LearningProfile["grade"],
    subjectId: row.subject_id,
    goals: Array.isArray(row.goals) ? (row.goals as LearningProfile["goals"]) : ["school"],
    examDate: row.exam_date ?? undefined,
    minutesPerDay: row.minutes_per_day,
    updatedAt: Date.parse(row.updated_at) || Date.now(),
  };
}

function asState(row: {
  diagnostic: unknown;
  topics: unknown;
  attempts: unknown;
} | null): LearningState {
  if (!row) return EMPTY_STATE;
  return {
    diagnostic: (row.diagnostic as LearningState["diagnostic"]) ?? null,
    topics: row.topics && typeof row.topics === "object" ? (row.topics as LearningState["topics"]) : {},
    attempts: Array.isArray(row.attempts) ? (row.attempts as LearningState["attempts"]) : [],
  };
}

export async function readOwnProgress(user: AuthedUser) {
  const supabase = await createServerSupabase();
  if (!supabase) throw new HttpError(503, "Supabase is not configured.");

  const [{ data: profile }, { data: state }, { data: memberships }] = await Promise.all([
    supabase.from("learning_profiles").select("*").eq("user_id", user.id).maybeSingle(),
    supabase.from("learning_state").select("*").eq("user_id", user.id).maybeSingle(),
    supabase.from("class_members").select("class_id").eq("student_id", user.id),
  ]);

  const classIds = (memberships ?? []).map((m: { class_id: string }) => m.class_id);
  let topics: Topic[] = [];
  const classId: string | null = classIds[0] ?? null;
  let inviteCode: string | null = null;

  if (classIds.length > 0) {
    const { data: custom } = await supabase
      .from("custom_topics")
      .select("topic, clip_script, notes, class_id")
      .in("class_id", classIds);
    topics = (custom ?? [])
      .map((row: { topic?: Topic | null; clip_script?: Topic["clipScript"] }) => topicFromCustomRow(row))
      .filter((topic): topic is Topic => Boolean(topic));
    const { data: cls } = await supabase
      .from("classes")
      .select("id, invite_code")
      .eq("id", classIds[0])
      .maybeSingle();
    inviteCode = cls?.invite_code ?? null;
  }

  return {
    profile: profile ? asProfile(profile) : null,
    state: asState(state),
    topics,
    classId,
    inviteCode,
  };
}

function homeworkStatus(topic: Topic, state: LearningState): StudentHomeworkItem["status"] {
  if (isTopicComplete(topic, state)) return "done";
  const topicState = topicStateOf(state, topic.id);
  if (topicState.attempts > 0) return "in_progress";
  return "assigned";
}

export async function getStudentClassOverview(user: AuthedUser): Promise<StudentClassOverview> {
  requireRole(user, "student");
  const supabase = await createServerSupabase();
  if (!supabase) {
    return {
      configured: false,
      class: null,
      memberCount: 0,
      classmates: [],
      homework: [],
      exams: [],
    };
  }

  const { data: memberships } = await supabase
    .from("class_members")
    .select("class_id")
    .eq("student_id", user.id);
  const classIds = (memberships ?? []).map((m: { class_id: string }) => m.class_id);
  const classId = classIds[0] ?? null;

  const [{ data: profile }, { data: stateRow }] = await Promise.all([
    supabase.from("learning_profiles").select("*").eq("user_id", user.id).maybeSingle(),
    supabase.from("learning_state").select("*").eq("user_id", user.id).maybeSingle(),
  ]);
  const state = asState(stateRow ?? null);
  const learningProfile = profile ? asProfile(profile) : null;

  const { data: deadlineRows } = classId
    ? await supabase
        .from("class_deadlines")
        .select("title, due_on")
        .eq("class_id", classId)
        .order("due_on", { ascending: true })
    : { data: [] as Array<{ title: string; due_on: string }> };

  const exams = mergeClassExams(
    learningProfile?.examDate,
    (deadlineRows ?? []) as Array<{ title: string; due_on: string }>,
  );

  if (!classId) {
    return {
      configured: true,
      class: null,
      memberCount: 0,
      classmates: [],
      homework: [],
      exams,
    };
  }

  const { data: cls } = await supabase
    .from("classes")
    .select("id, name, invite_code, teacher_id")
    .eq("id", classId)
    .maybeSingle();

  let teacherName: string | null = null;
  if (cls?.teacher_id) {
    const { data: teacher } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", cls.teacher_id)
      .maybeSingle();
    teacherName = teacher?.display_name ?? null;
  }

  const { data: countRaw } = await supabase.rpc("student_class_member_count", { p_class_id: classId });
  let memberCount = typeof countRaw === "number" ? countRaw : 0;
  if (!memberCount) {
    const { count } = await supabase
      .from("class_members")
      .select("student_id", { count: "exact", head: true })
      .eq("class_id", classId);
    memberCount = count ?? 1;
  }

  const { data: members } = await supabase
    .from("class_members")
    .select("student_id")
    .eq("class_id", classId);
  const otherIds = (members ?? [])
    .map((row: { student_id: string }) => row.student_id)
    .filter((id: string) => id !== user.id);

  let classmates: { displayName: string }[] = [];
  if (otherIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, display_name")
      .in("id", otherIds);
    classmates = (profiles ?? [])
      .map((row: { display_name: string | null }) => ({ displayName: row.display_name?.trim() ?? "" }))
      .filter((row: { displayName: string }) => row.displayName.length > 0);
  }

  const { data: custom } = await supabase.from("custom_topics").select("topic, clip_script, notes").eq("class_id", classId);
  const homework: StudentHomeworkItem[] = (custom ?? [])
    .map((row: { topic?: Topic | null; clip_script?: Topic["clipScript"] }) => topicFromCustomRow(row))
    .filter((topic): topic is Topic => Boolean(topic))
    .map((topic: Topic) => ({
      id: topic.id,
      title: topic.title,
      summary: topic.summary,
      author: topic.author,
      status: homeworkStatus(topic, state),
      hasClip: Boolean(topic.clipScript?.scenes?.length),
    }));

  return {
    configured: true,
    class: cls
      ? {
          id: cls.id,
          name: cls.name,
          inviteCode: cls.invite_code,
          teacherName,
        }
      : null,
    memberCount,
    classmates: asArray(classmates),
    homework: asArray(homework),
    exams: asArray(exams),
  };
}

export async function removeStudentFromTeacherClasses(user: AuthedUser, studentId: string): Promise<boolean> {
  requireRole(user, "teacher");
  const supabase = await createServerSupabase();
  if (!supabase) throw new HttpError(503, "Supabase is not configured.");
  const classes = await listClassesForUser(user);
  const classIds = asArray(classes).map((c) => c.id);
  if (classIds.length === 0) return false;
  const { error, count } = await supabase
    .from("class_members")
    .delete({ count: "exact" })
    .eq("student_id", studentId)
    .in("class_id", classIds);
  if (error) throw new HttpError(500, publicErrorMessage(error, "Не удалось удалить ученика."));
  return (count ?? 0) > 0;
}

export async function writeOwnProgress(
  user: AuthedUser,
  input: { profile: LearningProfile | null; state: LearningState },
) {
  requireRole(user, "student");
  const supabase = await createServerSupabase();
  if (!supabase) throw new HttpError(503, "Supabase is not configured.");

  if (input.profile) {
    const { error } = await supabase.from("learning_profiles").upsert({
      user_id: user.id,
      grade: input.profile.grade,
      subject_id: input.profile.subjectId,
      goals: input.profile.goals,
      exam_date: input.profile.examDate || null,
      minutes_per_day: input.profile.minutesPerDay,
      updated_at: new Date().toISOString(),
    });
    if (error) throw new HttpError(500, error.message);
  }

  const { error } = await supabase.from("learning_state").upsert({
    user_id: user.id,
    diagnostic: input.state.diagnostic,
    topics: input.state.topics,
    attempts: input.state.attempts,
    next_reviews: Object.fromEntries(
      Object.entries(input.state.topics).map(([id, topic]) => [id, topic.nextReviewAt ?? null]),
    ),
    updated_at: new Date().toISOString(),
  });
  if (error) throw new HttpError(500, error.message);
  return { ok: true };
}

export async function publishTopic(user: AuthedUser, classId: string, topic: Topic) {
  requireRole(user, "teacher");
  const supabase = await createServerSupabase();
  if (!supabase) throw new HttpError(503, "Supabase is not configured.");
  const payload = {
    id: topic.id,
    class_id: classId,
    teacher_id: user.id,
    topic: { ...topic, custom: true, author: user.name || user.email },
    clip_script: topic.clipScript ?? null,
    notes: topic.notes ?? null,
    updated_at: new Date().toISOString(),
  };
  let { error } = await supabase.from("custom_topics").upsert(payload);
  if (error && /notes/i.test(error.message)) {
    const { notes: _notes, ...withoutNotes } = payload;
    void _notes;
    ({ error } = await supabase.from("custom_topics").upsert(withoutNotes));
  }
  if (error && /clip_script/i.test(error.message)) {
    const { clip_script: _ignored, notes: _notes, ...legacy } = payload;
    void _ignored;
    void _notes;
    ({ error } = await supabase.from("custom_topics").upsert(legacy));
  }
  if (error) throw new HttpError(500, error.message);
  return { ...topic, custom: true as const, author: user.name || user.email };
}

export async function removeTopic(user: AuthedUser, topicId: string) {
  requireRole(user, "teacher");
  const supabase = await createServerSupabase();
  if (!supabase) throw new HttpError(503, "Supabase is not configured.");
  const { error } = await supabase.from("custom_topics").delete().eq("id", topicId).eq("teacher_id", user.id);
  if (error) throw new HttpError(500, error.message);
  return { ok: true };
}

export async function classBoard(user: AuthedUser, classId?: string) {
  requireRole(user, "teacher");
  const supabase = await createServerSupabase();
  if (!supabase) throw new HttpError(503, "Supabase is not configured.");

  const classes = await listClassesForUser(user);
  const active = classId ? classes.find((c) => c.id === classId) : classes[0];
  if (!active) {
    return { classes, students: [], heatmap: [] };
  }

  const { data: custom } = await supabase.from("custom_topics").select("topic, clip_script, notes").eq("class_id", active.id);
  const catalog: Topic[] = [
    ...BASE_TOPICS,
    ...((custom ?? [])
      .map((row: { topic?: Topic | null; clip_script?: Topic["clipScript"] }) => topicFromCustomRow(row))
      .filter((topic): topic is Topic => Boolean(topic))),
  ];

  const studentIds = asArray<string>(active.studentIds);
  if (studentIds.length === 0) {
    return { classes, students: [], heatmap: buildHeatmap(catalog, []) };
  }

  const [{ data: profiles }, { data: learningProfiles }, { data: learningStates }, { data: clipRows }] =
    await Promise.all([
      supabase.from("profiles").select("id, email, display_name").in("id", studentIds),
      supabase.from("learning_profiles").select("*").in("user_id", studentIds),
      supabase.from("learning_state").select("*").in("user_id", studentIds),
      supabase.from("clip_events").select("user_id, event").in("user_id", studentIds),
    ]);

  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));
  const lpById = new Map((learningProfiles ?? []).map((p) => [p.user_id, p]));
  const lsById = new Map((learningStates ?? []).map((p) => [p.user_id, p]));
  const clipsById = new Map<string, { watched: number; dropped: number; stuck: number }>();
  for (const row of clipRows ?? []) {
    const current = clipsById.get(row.user_id) ?? { watched: 0, dropped: 0, stuck: 0 };
    if (row.event === "complete") current.watched += 1;
    if (row.event === "drop") current.dropped += 1;
    if (row.event === "quiz_wrong") current.stuck += 1;
    clipsById.set(row.user_id, current);
  }

  const students = studentIds.map((id) => {
    const profileRow = profileById.get(id);
    const lp = lpById.get(id);
    const ls = lsById.get(id);
    const state = asState(ls ?? null);
    const profile = lp ? asProfile(lp) : null;
    const snapshot = snapshotFromProgress({
      email: profileRow?.email ?? id,
      name: profileRow?.display_name ?? undefined,
      profile,
      state,
      topics: catalog,
    })!;
    snapshot.lastActivityAt = Math.max(
      profile?.updatedAt ?? 0,
      state.diagnostic?.at ?? 0,
      ...Object.values(state.topics).map((t) => t.lastAt ?? 0),
    );
    snapshot.clipStats = clipsById.get(id) ?? { watched: 0, dropped: 0, stuck: 0 };
    const missedTasks = state.attempts
      .filter((attempt) => !attempt.correct)
      .slice(0, 12)
      .map((attempt) => {
        const task = findTask(catalog, attempt.taskId);
        return {
          topicId: attempt.topicId,
          taskId: attempt.taskId,
          skill: attempt.skill,
          prompt: task?.prompt ?? attempt.skill,
        };
      });
    snapshot.missedTasks = missedTasks;
    return {
      id,
      email: snapshot.email,
      name: snapshot.name,
      snapshot,
      missedTasks,
      clipStats: snapshot.clipStats,
    };
  });

  return { classes, students, heatmap: buildHeatmap(catalog, students) };
}

function buildHeatmap(
  catalog: Topic[],
  students: Array<{ id: string; snapshot: { weakTopics: string[] }; missedTasks: Array<{ topicId: string }> }>,
) {
  const topicIds = new Set<string>();
  for (const student of students) {
    for (const id of student.snapshot.weakTopics) topicIds.add(id);
    for (const missed of student.missedTasks) topicIds.add(missed.topicId);
  }
  return [...topicIds].map((topicId) => {
    const topic = findTopic(catalog, topicId);
    return {
      topicId,
      title: topic?.title ?? topicId,
      cells: students.map((student) => {
        const failing = student.snapshot.weakTopics.includes(topicId);
        const missed = student.missedTasks.filter((item) => item.topicId === topicId).length;
        return {
          studentId: student.id,
          failing,
          accuracy: failing ? Math.max(0, 60 - missed * 10) : missed > 0 ? 70 : null,
        };
      }),
    };
  });
}

export async function compactClassContext(user: AuthedUser, studentId: string, classId?: string) {
  const board = await classBoard(user, classId);
  const selected = board.students.find((s) => s.id === studentId) ?? board.students[0] ?? null;
  const active = classId
    ? board.classes.find((c) => c.id === classId)
    : board.classes[0];
  return {
    class: active
      ? {
          id: active.id,
          name: active.name,
          inviteCode: active.inviteCode,
          studentCount: board.students.length,
          atRisk: board.students
            .filter((s) => s.snapshot.accuracy < 60)
            .map((s) => ({ name: s.name || s.email, accuracy: s.snapshot.accuracy, weak: s.snapshot.weakTopics })),
        }
      : null,
    student: selected
      ? {
          id: selected.id,
          name: selected.name || selected.email,
          grade: selected.snapshot.grade,
          subjectId: selected.snapshot.subjectId,
          mastery: selected.snapshot.mastery,
          accuracy: selected.snapshot.accuracy,
          weakTopics: selected.snapshot.weakTopics,
          solvedTasks: selected.snapshot.solvedTasks,
          lastActivityAt: selected.snapshot.lastActivityAt,
          missedTasks: selected.missedTasks.slice(0, 6),
        }
      : null,
  };
}
