import { studentsApiMiddleware } from "@/server/portal-plugins/studentsApiMiddleware";
import { runPortalMiddleware } from "@/server/runPortalMiddleware";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import {
  createClassForTeacher,
  deleteClassForTeacher,
  joinClassAsStudent,
  listClassesForUser,
} from "@/lib/server/class-service";
import { HttpError } from "@/lib/server/require-user";
import { requireUserResponse } from "@/lib/server/require-user";
import { publicErrorMessage } from "@/lib/server/public-error";

export const runtime = "nodejs";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

async function handleSupabase(request: Request, ctx: { params: Promise<{ slug?: string[] }> }) {
  const { user, error } = await requireUserResponse();
  if (error) return error;
  const { slug } = await ctx.params;
  const path = slug?.length ? slug.join("/") : "";
  const method = request.method.toUpperCase();

  try {
    if (!path && method === "GET") {
      const classes = await listClassesForUser(user);
      return json({ classes });
    }
    if (!path && method === "POST") {
      const body = (await request.json().catch(() => null)) as { name?: string } | null;
      if (!body?.name?.trim()) return json({ error: "Required: name" }, 400);
      const created = await createClassForTeacher(user, body.name);
      return json({ class: created });
    }
    if (path === "join" && method === "POST") {
      const body = (await request.json().catch(() => null)) as { inviteCode?: string } | null;
      if (!body?.inviteCode?.trim()) return json({ error: "Required: inviteCode" }, 400);
      const joined = await joinClassAsStudent(user, body.inviteCode);
      return json({ class: { id: joined.classId, name: joined.name, inviteCode: joined.inviteCode }, student: { id: user.id } });
    }
    if (path && method === "GET") {
      const classes = await listClassesForUser(user);
      const found = classes.find((c) => c.id === path);
      if (!found) return json({ error: "Not found" }, 404);
      return json({ class: found });
    }
    if (path && method === "DELETE") {
      const ok = await deleteClassForTeacher(user, path);
      return json({ ok }, ok ? 200 : 404);
    }
    return json({ error: "Not Found" }, 404);
  } catch (err) {
    if (err instanceof HttpError) return json({ error: err.message }, err.status);
    return json({ error: publicErrorMessage(err, "Не удалось выполнить запрос.") }, 500);
  }
}

async function handle(request: Request, ctx: { params: Promise<{ slug?: string[] }> }) {
  if (isSupabaseConfigured()) return handleSupabase(request, ctx);
  const { slug } = await ctx.params;
  const url = new URL(request.url);
  const path =
    (slug?.length ? `/api/classes/${slug.join("/")}` : "/api/classes") + url.search;
  return runPortalMiddleware(request, path, studentsApiMiddleware, {
    expectBoolean: true,
  });
}

export const GET = handle;
export const POST = handle;
export const DELETE = handle;
