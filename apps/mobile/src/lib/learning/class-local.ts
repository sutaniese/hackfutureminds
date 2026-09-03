import { memoryGet, memoryRemove, memorySet, subscribeStorage } from "../storage";
import { isInviteCodeFormat, normalizeInviteCode } from "./invite";

const KEY = "ten-class-invite";

export type LocalClassJoin = {
  classId: string;
  name: string;
  inviteCode: string;
  teacherName?: string | null;
  joinedAt: number;
  localOnly: boolean;
};

export function readLocalClassJoin(): LocalClassJoin | null {
  try {
    const raw = memoryGet(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LocalClassJoin;
    if (!parsed?.inviteCode) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveLocalClassJoin(input: {
  inviteCode: string;
  name?: string;
  classId?: string;
  teacherName?: string | null;
  localOnly: boolean;
}): LocalClassJoin {
  const inviteCode = normalizeInviteCode(input.inviteCode);
  const saved: LocalClassJoin = {
    classId: input.classId || `local:${inviteCode}`,
    name: input.name?.trim() || inviteCode,
    inviteCode,
    teacherName: input.teacherName ?? null,
    joinedAt: Date.now(),
    localOnly: input.localOnly,
  };
  memorySet(KEY, JSON.stringify(saved));
  return saved;
}

export function clearLocalClassJoin(): void {
  memoryRemove(KEY);
}

export function subscribeLocalClass(listener: () => void): () => void {
  return subscribeStorage(listener);
}

export function previewInvite(code: string): string {
  const normalized = normalizeInviteCode(code);
  return isInviteCodeFormat(normalized) ? normalized : normalized;
}
