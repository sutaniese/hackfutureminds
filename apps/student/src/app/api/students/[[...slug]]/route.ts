import { studentsApiMiddleware } from "@/server/portal-plugins/studentsApiMiddleware";
import { runPortalMiddleware } from "@/server/runPortalMiddleware";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { classBoard, removeStudentFromTeacherClasses } from "@/lib/server/class-service";
import { HttpError } from "@/lib/server/require-user";
import { requireUserResponse, type AuthedUser } from "@/lib/server/require-user";
import { publicErrorMessage } from "@/lib/server/public-error";
import { asArray } from "@/lib/safe-list";

export const runtime = "nodejs";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

type PortalStudent = {
  id: string;
  displayName: string;
  age: number;
  city: string;
  interests: string[];
  achievements: string[];
  target_university: string;
  language: "ru";
  primaryCareerTitle: string;
  career_map: unknown[];
  financial_route: { monthly_cost: number; grants: unknown[]; gap: number; coverage_percent: number };
  portfolio_block: string;
  classId: string | null;
  onboardingComplete: boolean;
  needsFinancialHelp: boolean;
  createdAt: string;
  updatedAt: string;
};

function mapBoardStudent(s: {
  id: string;
  name?: string;
  email: string;
  snapshot: { weakTopics?: string[]; solvedTasks?: number; accuracy?: number; subjectId?: string; updatedAt?: number };
}): PortalStudent {
  return {
    id: s.id,
    displayName: s.name || s.email,
    age: 16,
    city: "—",
    interests: asArray(s.snapshot.weakTopics),
    achievements: [],
    target_university: "",
    language: "ru",
    primaryCareerTitle: s.snapshot.subjectId ?? "",
    career_map: [],
    financial_route: { monthly_cost: 0, grants: [], gap: 0, coverage_percent: 0 },
    portfolio_block: "",
    classId: null,
    onboardingComplete: Boolean(s.snapshot.solvedTasks || s.snapshot.accuracy),
    needsFinancialHelp: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date(s.snapshot.updatedAt ?? Date.now()).toISOString(),
  };
}

function normalizeStudent(body: Record<string, unknown>, fallbackId?: string): PortalStudent {
  const id = String(body.id ?? fallbackId ?? "");
  return {
    id,
    displayName: String(body.displayName ?? body.name ?? body.email ?? id),
    age: typeof body.age === "number" ? body.age : 16,
    city: String(body.city ?? "—"),
    interests: asArray<string>(body.interests),
    achievements: asArray<string>(body.achievements),
    target_university: String(body.target_university ?? ""),
    language: "ru",
    primaryCareerTitle: String(body.primaryCareerTitle ?? ""),
    career_map: asArray(body.career_map),
    financial_route:
      body.financial_route && typeof body.financial_route === "object"
        ? (body.financial_route as PortalStudent["financial_route"])
        : { monthly_cost: 0, grants: [], gap: 0, coverage_percent: 0 },
    portfolio_block: String(body.portfolio_block ?? ""),
    classId: typeof body.classId === "string" ? body.classId : null,
    onboardingComplete: Boolean(body.onboardingComplete),
    needsFinancialHelp: Boolean(body.needsFinancialHelp),
    createdAt: String(body.createdAt ?? new Date().toISOString()),
    updatedAt: new Date().toISOString(),
  };
}

async function listPortalStudents(user: AuthedUser): Promise<PortalStudent[]> {
  if (user.role !== "teacher") return [];
  const board = await classBoard(user);
  const students = Array.isArray(board.students) ? board.students : [];
  return students.map(mapBoardStudent);
}

async function handleSupabase(request: Request, ctx: { params: Promise<{ slug?: string[] }> }) {
  const { user, error } = await requireUserResponse();
  if (error) return error;
  const { slug } = await ctx.params;
  const parts = asArray<string>(slug);
  const method = request.method.toUpperCase();

  try {
    if (parts.length === 0 && method === "GET") {
      return json({ students: await listPortalStudents(user) });
    }

    if (parts.length === 0 && method === "POST") {
      const body = ((await request.json().catch(() => null)) ?? {}) as Record<string, unknown>;
      const roster = await listPortalStudents(user);
      const existing = roster.find((s) => s.id && s.id === body.id);
      return json({ student: existing ?? normalizeStudent(body) });
    }

    if (parts.length === 1 && method === "GET") {
      const roster = await listPortalStudents(user);
      const found = roster.find((s) => s.id === parts[0]);
      if (!found) return json({ error: "Ученик не найден." }, 404);
      return json({ student: found });
    }

    if (parts.length === 1 && (method === "PUT" || method === "PATCH")) {
      const body = ((await request.json().catch(() => null)) ?? {}) as Record<string, unknown>;
      const roster = await listPortalStudents(user);
      const existing = roster.find((s) => s.id === parts[0]);
      return json({ student: existing ? { ...existing, ...normalizeStudent({ ...existing, ...body }, parts[0]) } : normalizeStudent(body, parts[0]) });
    }

    if (parts.length === 1 && method === "DELETE") {
      const ok = user.role === "teacher" ? await removeStudentFromTeacherClasses(user, parts[0]) : false;
      return json({ ok }, ok ? 200 : 404);
    }

    if (parts.length === 2 && parts[1] === "notes" && method === "GET") {
      return json({ notes: [] });
    }

    if (parts.length === 2 && parts[1] === "notes" && method === "POST") {
      const body = ((await request.json().catch(() => null)) ?? {}) as {
        title?: string;
        content?: string;
        fileName?: string;
      };
      const fileName = body.fileName?.trim() || `note-${Date.now()}.md`;
      return json({
        note: {
          fileName,
          title: body.title ?? "",
          content: body.content ?? "",
          updatedAt: new Date().toISOString(),
        },
      });
    }

    if (parts.length >= 3 && parts[1] === "notes" && method === "GET") {
      return json({ fileName: parts.slice(2).join("/"), content: "" });
    }

    if (parts.length >= 3 && parts[1] === "notes" && method === "DELETE") {
      return json({ ok: true });
    }

    return json({ error: "Not Found" }, 404);
  } catch (err) {
    if (err instanceof HttpError) return json({ error: err.message }, err.status);
    return json({ error: publicErrorMessage(err, "Не удалось загрузить учеников.") }, 500);
  }
}

async function handle(request: Request, ctx: { params: Promise<{ slug?: string[] }> }) {
  if (isSupabaseConfigured()) return handleSupabase(request, ctx);
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
