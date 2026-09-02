import { HttpError } from "@/lib/server/require-user";
import { requireUserResponse } from "@/lib/server/require-user";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { classBoard } from "@/lib/server/class-service";

export const runtime = "nodejs";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

export async function GET(request: Request) {
  if (!isSupabaseConfigured()) {
    return json({ classes: [], students: [], heatmap: [], fallback: "local" });
  }
  const { user, error } = await requireUserResponse();
  if (error) return error;
  const classId = new URL(request.url).searchParams.get("classId") ?? undefined;
  try {
    const board = await classBoard(user, classId);
    return json(board);
  } catch (err) {
    if (err instanceof HttpError) return json({ error: err.message }, err.status);
    return json({ error: err instanceof Error ? err.message : "Server error" }, 500);
  }
}
