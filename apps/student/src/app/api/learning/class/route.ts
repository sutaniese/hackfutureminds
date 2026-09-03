import { HttpError } from "@/lib/server/require-user";
import { requireUserResponse } from "@/lib/server/require-user";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getStudentClassOverview } from "@/lib/server/class-service";
import { publicErrorMessage } from "@/lib/server/public-error";
import { asArray } from "@/lib/safe-list";

export const runtime = "nodejs";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

export async function GET() {
  if (!isSupabaseConfigured()) {
    return json({
      configured: false,
      class: null,
      memberCount: 0,
      classmates: [],
      homework: [],
      exams: [],
    });
  }
  const { user, error } = await requireUserResponse();
  if (error) return error;
  try {
    const overview = await getStudentClassOverview(user);
    return json({
      ...overview,
      classmates: asArray(overview.classmates),
      homework: asArray(overview.homework),
      exams: asArray(overview.exams),
    });
  } catch (err) {
    if (err instanceof HttpError) return json({ error: err.message }, err.status);
    return json({ error: publicErrorMessage(err, "Не удалось загрузить класс.") }, 500);
  }
}
