import { studentsApiMiddleware } from "@/server/portal-plugins/studentsApiMiddleware";
import { runPortalMiddleware } from "@/server/runPortalMiddleware";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { classBoard } from "@/lib/server/class-service";
import { HttpError } from "@/lib/server/require-user";
import { requireUserResponse } from "@/lib/server/require-user";

export const runtime = "nodejs";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

async function handleSupabase(request: Request) {
  const { user, error } = await requireUserResponse();
  if (error) return error;
  const method = request.method.toUpperCase();
  if (method !== "GET") {
    return json({ error: "Use /api/classes and /api/learning/* for writes." }, 405);
  }
  try {
    const board = user.role === "teacher" ? await classBoard(user) : { students: [] };
    const students = board.students.map((s) => ({
      id: s.id,
      displayName: s.name || s.email,
      age: 16,
      city: "—",
      interests: s.snapshot.weakTopics,
      achievements: [],
      target_university: "",
      language: "ru" as const,
      primaryCareerTitle: s.snapshot.subjectId,
      career_map: [],
      financial_route: { monthly_cost: 0, grants: [], gap: 0, coverage_percent: 0 },
      portfolio_block: "",
      classId: null,
      onboardingComplete: Boolean(s.snapshot.solvedTasks || s.snapshot.accuracy),
      needsFinancialHelp: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date(s.snapshot.updatedAt).toISOString(),
    }));
    return json({ students });
  } catch (err) {
    if (err instanceof HttpError) return json({ error: err.message }, err.status);
    return json({ error: err instanceof Error ? err.message : "Server error" }, 500);
  }
}

async function handle(request: Request, ctx: { params: Promise<{ slug?: string[] }> }) {
  if (isSupabaseConfigured()) return handleSupabase(request);
  const { slug } = await ctx.params;
  const url = new URL(request.url);
  const path =
    (slug?.length ? `/api/students/${slug.join("/")}` : "/api/students") + url.search;
  return runPortalMiddleware(request, path, studentsApiMiddleware, {
    expectBoolean: true,
  });
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
