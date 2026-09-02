import { HttpError } from "@/lib/server/require-user";
import { requireUserResponse } from "@/lib/server/require-user";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getStudentClassOverview } from "@/lib/server/class-service";

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
    return json(overview);
  } catch (err) {
    if (err instanceof HttpError) return json({ error: err.message }, err.status);
    return json({ error: err instanceof Error ? err.message : "Server error" }, 500);
  }
}
