import { describe, expect, it, vi } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { createBearerSupabaseClient } from "@/lib/supabase/bearer-client";
import { resolveUserIdFromAuth } from "@/lib/server/require-user";
import { asArray } from "@/lib/safe-list";

vi.mock("next/headers", () => ({
  cookies: async () => ({ getAll: () => [], set: () => undefined }),
  headers: async () => ({ get: () => null }),
}));

vi.mock("@/lib/supabase/env", () => ({
  isSupabaseConfigured: () => true,
  getSupabaseUrl: () => "https://example.supabase.co",
  getSupabaseAnonKey: () => "anon-key",
}));

vi.mock("@/lib/server/class-service", () => ({
  joinClassAsStudent: vi.fn(async () => ({ classId: "c1", name: "11Б", inviteCode: "TN-KFMVE2" })),
  listClassesForUser: vi.fn(async () => []),
  createClassForTeacher: vi.fn(),
  deleteClassForTeacher: vi.fn(),
}));

vi.mock("@/lib/server/require-user", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/server/require-user")>();
  return {
    ...actual,
    requireUserResponse: vi.fn(async () => ({
      user: { id: "student-1", email: "s@x.c", role: "student" as const },
    })),
  };
});

const JWT = "eyJhbGciOiJub25lIn0.eyJzdWIiOiJzdHVkZW50LTEifQ.";

describe("invite join handler auth", () => {
  it("does not call getClaims on an accessToken-configured client", async () => {
    const blocked = createClient("https://example.supabase.co", "anon-key", {
      accessToken: async () => JWT,
    });
    await expect(blocked.auth.getClaims(JWT)).rejects.toThrow(/getClaims is not possible/);

    const client = createBearerSupabaseClient("https://example.supabase.co", "anon-key", JWT);
    client.auth.getClaims = async (jwt?: string) => {
      if (!jwt) throw new Error("invite handler must pass the Bearer JWT as an argument");
      return { data: { claims: { sub: "student-1", email: "s@x.c" } }, error: null };
    };
    const user = await resolveUserIdFromAuth(client, JWT);
    expect(user.userId).toBe("student-1");
    expect((client as { accessToken?: unknown }).accessToken).toBeUndefined();
  });

  it("POST /api/classes/join succeeds for a signed-in student", async () => {
    const { POST } = await import("./[[...slug]]/route");
    const res = await POST(
      new Request("http://localhost/api/classes/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteCode: "TN-KFMVE2" }),
      }),
      { params: Promise.resolve({ slug: ["join"] }) },
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { class?: { inviteCode?: string }; error?: string };
    expect(body.error).toBeUndefined();
    expect(body.class?.inviteCode).toBe("TN-KFMVE2");
  });

  it("guards non-array class member lists", () => {
    expect(asArray(undefined).length).toBe(0);
    expect(asArray({ students: [] }).length).toBe(0);
    expect(asArray(["a"]).length).toBe(1);
  });
});
