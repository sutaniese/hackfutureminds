import { requireUserResponse } from "@/lib/server/require-user";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createServerSupabase } from "@/lib/supabase/server";

export const runtime = "nodejs";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) return json({ ok: true });
  const { user, error } = await requireUserResponse();
  if (error) return error;
  const body = (await request.json().catch(() => null)) as {
    clipId?: string;
    topicId?: string;
    event?: "start" | "complete" | "drop" | "quiz_wrong" | "quiz_right" | "stuck";
  } | null;
  if (!body?.clipId || !body.topicId || !body.event) {
    return json({ error: "Required: clipId, topicId, event" }, 400);
  }
  const supabase = await createServerSupabase();
  if (!supabase) return json({ ok: true });
  const { error: insertError } = await supabase.from("clip_events").insert({
    user_id: user.id,
    clip_id: body.clipId,
    topic_id: body.topicId,
    event: body.event,
  });
  if (insertError) return json({ error: insertError.message }, 500);
  return json({ ok: true });
}
