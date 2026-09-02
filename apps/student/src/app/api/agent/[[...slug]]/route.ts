import { agentMiddleware } from "@/server/portal-plugins/agentMiddleware";
import { runPortalMiddleware } from "@/server/runPortalMiddleware";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { HttpError } from "@/lib/server/require-user";
import { requireUserResponse } from "@/lib/server/require-user";
import { teacherAgentChat, teacherAgentHistory } from "@/lib/server/teacher-agent";

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
  const tail = slug?.join("/") ?? "";
  const method = request.method.toUpperCase();
  try {
    if (tail === "history" && method === "GET") {
      const studentId = new URL(request.url).searchParams.get("studentId") ?? "";
      if (!studentId) return json({ error: "Required: studentId" }, 400);
      const conversation = await teacherAgentHistory(user, studentId);
      return json({ conversation: { id: studentId, studentId, messages: conversation.messages } });
    }
    if (tail === "clear" && method === "POST") {
      return json({ ok: true });
    }
    if ((tail === "chat" || tail === "") && method === "POST") {
      const body = (await request.json().catch(() => null)) as {
        studentId?: string;
        classId?: string;
        message?: string;
        publish?: boolean;
      } | null;
      if (!body?.message?.trim()) return json({ error: "Required: message" }, 400);
      const result = await teacherAgentChat(user, {
        studentId: body.studentId,
        classId: body.classId,
        message: body.message,
        publish: body.publish,
      });
      return json({
        reply: result.reply,
        source: result.source,
        published: result.published,
        pack: result.pack,
      });
    }
    return json({ error: "Not Found" }, 404);
  } catch (err) {
    if (err instanceof HttpError) return json({ error: err.message }, err.status);
    return json({ error: err instanceof Error ? err.message : "Server error" }, 500);
  }
}

async function handle(request: Request, ctx: { params: Promise<{ slug?: string[] }> }) {
  if (isSupabaseConfigured()) return handleSupabase(request, ctx);
  const { slug } = await ctx.params;
  const url = new URL(request.url);
  const tail = slug?.length ? slug.join("/") : "";
  const path = `/api/agent${tail ? `/${tail}` : ""}` + url.search;
  return runPortalMiddleware(request, path, agentMiddleware, {
    expectBoolean: true,
  });
}

export const GET = handle;
export const POST = handle;
