import { HttpError } from "@/lib/server/require-user";
import { requireUserResponse } from "@/lib/server/require-user";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { readOwnProgress, writeOwnProgress } from "@/lib/server/class-service";
import type { LearningProfile, LearningState } from "@/lib/learning/store";

export const runtime = "nodejs";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

export async function GET() {
  if (!isSupabaseConfigured()) {
    return json({ profile: null, state: null, topics: [], classId: null, inviteCode: null });
  }
  const { user, error } = await requireUserResponse();
  if (error) return error;
  try {
    const bundle = await readOwnProgress(user);
    return json(bundle);
  } catch (err) {
    if (err instanceof HttpError) return json({ error: err.message }, err.status);
    return json({ error: err instanceof Error ? err.message : "Server error" }, 500);
  }
}

export async function PUT(request: Request) {
  if (!isSupabaseConfigured()) return json({ ok: true, fallback: "local" });
  const { user, error } = await requireUserResponse();
  if (error) return error;
  const body = (await request.json().catch(() => null)) as {
    profile?: LearningProfile | null;
    state?: LearningState;
  } | null;
  if (!body?.state) return json({ error: "Required: state" }, 400);
  try {
    await writeOwnProgress(user, { profile: body.profile ?? null, state: body.state });
    return json({ ok: true });
  } catch (err) {
    if (err instanceof HttpError) return json({ error: err.message }, err.status);
    return json({ error: err instanceof Error ? err.message : "Server error" }, 500);
  }
}
