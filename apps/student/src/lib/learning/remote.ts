"use client";

import { getCurrentUser } from "@/lib/auth";
import { asArray } from "@/lib/safe-list";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import type { LearningProfile, LearningState } from "./store";
import type { Topic } from "./types";

async function jsonFetch<T>(input: string, init?: RequestInit): Promise<T> {
  const res = await fetch(input, {
    ...init,
    credentials: "same-origin",
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  const text = await res.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { raw: text };
  }
  if (!res.ok) {
    const msg = (body as { error?: string })?.error ?? `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return body as T;
}

export function canSyncRemote(): boolean {
  return isSupabaseConfigured() && Boolean(getCurrentUser());
}

export async function pullLearningBundle(): Promise<{
  profile: LearningProfile | null;
  state: LearningState | null;
  topics: Topic[];
  classId: string | null;
  inviteCode: string | null;
} | null> {
  if (!canSyncRemote()) return null;
  try {
    return await jsonFetch("/api/learning/progress");
  } catch {
    return null;
  }
}

export async function pushLearningBundle(input: {
  profile: LearningProfile | null;
  state: LearningState;
}): Promise<void> {
  if (!canSyncRemote()) return;
  await jsonFetch("/api/learning/progress", {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export async function pullClassBoard(classId?: string) {
  const query = classId ? `?classId=${encodeURIComponent(classId)}` : "";
  return jsonFetch<{
    classes: Array<{
      id: string;
      name: string;
      inviteCode: string;
      studentIds: string[];
      createdAt: string;
    }>;
    students: Array<{
      id: string;
      email: string;
      name?: string;
      snapshot: import("./store").StudentLearningSnapshot;
      missedTasks: Array<{ topicId: string; taskId: string; skill: string; prompt: string }>;
      clipStats: { watched: number; dropped: number; stuck: number };
    }>;
    heatmap: Array<{ topicId: string; title: string; cells: Array<{ studentId: string; failing: boolean; accuracy: number | null }> }>;
  }>(`/api/class/board${query}`).then((board) => ({
    ...board,
    classes: asArray(board?.classes),
    students: asArray(board?.students),
    heatmap: asArray(board?.heatmap),
  }));
}

export async function joinClassByCode(inviteCode: string) {
  const result = await jsonFetch<{
    class: { id: string; name: string; inviteCode: string };
    classId?: string;
    name?: string;
    inviteCode?: string;
  }>("/api/classes/join", {
    method: "POST",
    body: JSON.stringify({ inviteCode }),
  });
  return {
    classId: result.class?.id ?? result.classId ?? "",
    name: result.class?.name ?? result.name ?? "",
    inviteCode: result.class?.inviteCode ?? result.inviteCode ?? inviteCode,
  };
}

export async function createClassRemote(name: string) {
  return jsonFetch<{ class: { id: string; name: string; inviteCode: string; studentIds: string[]; createdAt: string } }>(
    "/api/classes",
    { method: "POST", body: JSON.stringify({ name }) },
  ).then((r) => r.class);
}

export async function listClassesRemote() {
  return jsonFetch<{ classes: Array<{ id: string; name: string; inviteCode: string; studentIds: string[]; createdAt: string }> }>(
    "/api/classes",
  ).then((r) => asArray(r?.classes));
}

export async function deleteClassRemote(id: string) {
  return jsonFetch<{ ok: boolean }>(`/api/classes/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export async function publishCustomTopic(classId: string, topic: Topic) {
  return jsonFetch<{ topic: Topic }>("/api/learning/topics", {
    method: "POST",
    body: JSON.stringify({ classId, topic }),
  }).then((r) => r.topic);
}

export async function deleteCustomTopicRemote(topicId: string) {
  return jsonFetch<{ ok: boolean }>(`/api/learning/topics?id=${encodeURIComponent(topicId)}`, {
    method: "DELETE",
  });
}

export async function recordClipEvent(input: {
  clipId: string;
  topicId: string;
  event: "start" | "complete" | "drop" | "quiz_wrong" | "quiz_right" | "stuck";
}) {
  if (!canSyncRemote()) return;
  try {
    await jsonFetch("/api/clips/events", { method: "POST", body: JSON.stringify(input) });
  } catch {
    /* clip stats are best-effort */
  }
}
