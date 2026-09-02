import { HttpError } from "@/lib/server/require-user";
import { requireUserResponse } from "@/lib/server/require-user";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { publishTopic, readOwnProgress, removeTopic } from "@/lib/server/class-service";
import type { Topic } from "@/lib/learning/types";

export const runtime = "nodejs";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

export async function GET() {
  if (!isSupabaseConfigured()) return json({ topics: [] });
  const { user, error } = await requireUserResponse();
  if (error) return error;
  try {
    const bundle = await readOwnProgress(user);
    return json({ topics: bundle.topics, classId: bundle.classId });
  } catch (err) {
    if (err instanceof HttpError) return json({ error: err.message }, err.status);
    return json({ error: err instanceof Error ? err.message : "Server error" }, 500);
  }
}

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) return json({ error: "Supabase required to publish to a shared class" }, 503);
  const { user, error } = await requireUserResponse();
  if (error) return error;
  const body = (await request.json().catch(() => null)) as { classId?: string; topic?: Topic } | null;
  if (!body?.classId || !body.topic) return json({ error: "Required: classId, topic" }, 400);
  try {
    const topic = await publishTopic(user, body.classId, body.topic);
    return json({ topic });
  } catch (err) {
    if (err instanceof HttpError) return json({ error: err.message }, err.status);
    return json({ error: err instanceof Error ? err.message : "Server error" }, 500);
  }
}

export async function DELETE(request: Request) {
  if (!isSupabaseConfigured()) return json({ ok: true });
  const { user, error } = await requireUserResponse();
  if (error) return error;
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return json({ error: "Required: id" }, 400);
  try {
    await removeTopic(user, id);
    return json({ ok: true });
  } catch (err) {
    if (err instanceof HttpError) return json({ error: err.message }, err.status);
    return json({ error: err instanceof Error ? err.message : "Server error" }, 500);
  }
}
