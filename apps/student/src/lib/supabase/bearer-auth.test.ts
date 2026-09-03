import { createClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { createBearerSupabaseClient } from "./bearer-client";
import { resolveUserIdFromAuth } from "@/lib/server/require-user";

vi.mock("next/headers", () => ({
  cookies: async () => ({ getAll: () => [], set: () => undefined }),
  headers: async () => ({ get: () => null }),
}));

const URL = "https://example.supabase.co";
const KEY = "anon-public-key";
const JWT = "eyJhbGciOiJub25lIn0.eyJzdWIiOiJ1c2VyLTEiLCJlbWFpbCI6InN0dWRlbnRAeC5jIn0.";

describe("Bearer auth client", () => {
  it("resolves a user from a JWT argument without throwing the accessToken/getClaims error", async () => {
    const blocked = createClient(URL, KEY, { accessToken: async () => JWT });
    expect(() => blocked.auth.getClaims).toThrow(/accessToken option.*getClaims is not possible/s);

    const client = createBearerSupabaseClient(URL, KEY, JWT);
    let accessTokenBlocked = false;
    try {
      await client.auth.getClaims(JWT);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (/accessToken option|getClaims is not possible/i.test(msg)) accessTokenBlocked = true;
    }
    expect(accessTokenBlocked).toBe(false);
    expect((client as { accessToken?: unknown }).accessToken).toBeUndefined();
  });

  it("invite API path does not call getClaims on an accessToken-configured client", async () => {
    const accessTokenClient = createClient(URL, KEY, { accessToken: async () => JWT });
    expect(() => accessTokenClient.auth.getClaims).toThrow(/getClaims is not possible/);
    await expect(resolveUserIdFromAuth(accessTokenClient, JWT)).rejects.toMatchObject({
      status: 401,
      message: "Войдите в аккаунт.",
    });

    const bearerClient = createBearerSupabaseClient(URL, KEY, JWT);
    const getClaims = vi.fn(async (jwt?: string) => {
      expect(jwt).toBe(JWT);
      return { data: { claims: { sub: "user-1", email: "student@x.c" } }, error: null };
    });
    bearerClient.auth.getClaims = getClaims;

    const resolved = await resolveUserIdFromAuth(bearerClient, JWT);
    expect(resolved).toEqual({ userId: "user-1", email: "student@x.c" });
    expect(getClaims).toHaveBeenCalledWith(JWT);
    expect((bearerClient as { accessToken?: unknown }).accessToken).toBeUndefined();
  });
});

describe("createServerSupabase source", () => {
  it("does not construct an accessToken client in the server helper used by invite join", async () => {
    const { readFileSync } = await import("node:fs");
    const { dirname, join } = await import("node:path");
    const { fileURLToPath } = await import("node:url");
    const here = dirname(fileURLToPath(import.meta.url));
    const serverSrc = readFileSync(join(here, "server.ts"), "utf8");
    const bearerSrc = readFileSync(join(here, "bearer-client.ts"), "utf8");
    expect(serverSrc).not.toMatch(/accessToken:\s*async/);
    expect(bearerSrc).not.toMatch(/accessToken:\s*async/);
    expect(bearerSrc).toContain("getClaims(jwt)");
  });
});
