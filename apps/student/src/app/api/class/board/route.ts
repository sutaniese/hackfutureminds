import { HttpError } from "@/lib/server/require-user";
import { requireUserResponse } from "@/lib/server/require-user";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { classBoard } from "@/lib/server/class-service";
import { publicErrorMessage } from "@/lib/server/public-error";
import { asArray } from "@/lib/safe-list";

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
    return json({
      ...board,
      classes: asArray(board.classes),
      students: asArray(board.students),
      heatmap: asArray(board.heatmap),
    });
  } catch (err) {
    if (err instanceof HttpError) return json({ error: err.message }, err.status);
    return json({ error: publicErrorMessage(err, "Не удалось загрузить класс.") }, 500);
  }
}
