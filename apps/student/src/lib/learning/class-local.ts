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

function hasWindow(): boolean {
  return typeof window !== "undefined";
}

export function readLocalClassJoin(): LocalClassJoin | null {
  if (!hasWindow()) return null;
  try {
    const raw = window.localStorage.getItem(KEY);
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
  if (hasWindow()) {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(saved));
      window.dispatchEvent(new Event("ten-class-changed"));
    } catch {
      /* ignore quota */
    }
  }
  return saved;
}

export function clearLocalClassJoin(): void {
  if (!hasWindow()) return;
  try {
    window.localStorage.removeItem(KEY);
    window.dispatchEvent(new Event("ten-class-changed"));
  } catch {
    /* ignore */
  }
}

export function subscribeLocalClass(listener: () => void): () => void {
  if (!hasWindow()) return () => undefined;
  const onStorage = (event: StorageEvent) => {
    if (event.key === KEY) listener();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener("ten-class-changed", listener);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener("ten-class-changed", listener);
  };
}

export function previewInvite(code: string): string {
  const normalized = normalizeInviteCode(code);
  return isInviteCodeFormat(normalized) ? normalized : normalized;
}
