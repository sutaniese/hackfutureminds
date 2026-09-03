import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({
  cookies: async () => ({ getAll: () => [], set: () => undefined }),
  headers: async () => ({ get: () => null }),
}));

vi.mock("@/lib/supabase/env", () => ({
  isSupabaseConfigured: () => true,
  getSupabaseUrl: () => "https://example.supabase.co",
  getSupabaseAnonKey: () => "anon-key",
}));

vi.mock("@/lib/server/require-user", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/server/require-user")>();
  return {
    ...actual,
    requireUserResponse: vi.fn(async () => ({
      user: { id: "teacher-1", email: "t@x.c", role: "teacher" as const },
    })),
  };
});

vi.mock("@/lib/server/class-service", () => ({
  classBoard: vi.fn(async () => ({
    classes: [{ id: "c1", name: "11Б", inviteCode: "TN-KFMVE2", studentIds: ["s1"] }],
    students: [
      {
        id: "s1",
        email: "s@x.c",
        name: "Sam",
        snapshot: { weakTopics: [], solvedTasks: 1, accuracy: 80, subjectId: "math", updatedAt: Date.now() },
      },
    ],
    heatmap: [],
  })),
  removeStudentFromTeacherClasses: vi.fn(async () => true),
}));

const emptyCtx = { params: Promise.resolve({ slug: undefined as string[] | undefined }) };
const idCtx = { params: Promise.resolve({ slug: ["s1"] }) };

describe("/api/students methods", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("GET lists students as an array", async () => {
    const { GET } = await import("./[[...slug]]/route");
    const res = await GET(new Request("http://localhost/api/students"), emptyCtx);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { students?: unknown };
    expect(Array.isArray(body.students)).toBe(true);
    expect((body.students as { id: string }[])[0]?.id).toBe("s1");
  });

  it("POST upserts instead of returning 405", async () => {
    const { POST } = await import("./[[...slug]]/route");
    const res = await POST(
      new Request("http://localhost/api/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: "s1", displayName: "Sam" }),
      }),
      emptyCtx,
    );
    expect(res.status).not.toBe(405);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { student?: { id: string } };
    expect(body.student?.id).toBe("s1");
  });

  it("PUT and DELETE are exported and do not 405", async () => {
    const { PUT, DELETE } = await import("./[[...slug]]/route");
    const put = await PUT(
      new Request("http://localhost/api/students/s1", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName: "Sam" }),
      }),
      idCtx,
    );
    expect(put.status).not.toBe(405);
    const del = await DELETE(new Request("http://localhost/api/students/s1", { method: "DELETE" }), idCtx);
    expect(del.status).not.toBe(405);
    expect(del.status).toBe(200);
  });
});
