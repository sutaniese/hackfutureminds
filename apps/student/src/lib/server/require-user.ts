import { isUserRole, type UserRole } from "@/lib/site-nav";
import { createServerSupabase, readRequestAccessToken } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { publicErrorMessage } from "@/lib/server/public-error";

export type AuthedUser = {
  id: string;
  email: string;
  name?: string;
  role: UserRole;
};

export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function jsonError(status: number, message: string): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

type AuthReader = {
  auth: {
    getClaims: (jwt?: string) => Promise<{
      data: { claims?: { sub?: unknown; email?: unknown } } | null;
      error: { message?: string } | null;
    }>;
    getUser: (jwt?: string) => Promise<{ data: { user: { id: string; email?: string | null } | null } }>;
  };
};

/**
 * Cookie session or Bearer JWT (argument, never via the `accessToken` client option).
 */
export async function resolveUserIdFromAuth(
  supabase: AuthReader,
  bearerJwt?: string,
): Promise<{ userId: string; email: string }> {
  try {
    const { data, error } = bearerJwt
      ? await supabase.auth.getClaims(bearerJwt)
      : await supabase.auth.getClaims();
    const userId = data?.claims?.sub ? String(data.claims.sub) : "";
    const emailFromClaims = typeof data?.claims?.email === "string" ? data.claims.email : "";
    if (!error && userId) return { userId, email: emailFromClaims };

    const { data: userData } = bearerJwt
      ? await supabase.auth.getUser(bearerJwt)
      : await supabase.auth.getUser();
    if (!userData.user) {
      throw new HttpError(401, "Войдите в аккаунт.");
    }
    return { userId: userData.user.id, email: userData.user.email ?? emailFromClaims };
  } catch (err) {
    if (err instanceof HttpError) throw err;
    throw new HttpError(401, "Войдите в аккаунт.");
  }
}

/**
 * Resolve the signed-in user from cookies OR `Authorization: Bearer <jwt>`
 * (Expo). Role is never read from user_metadata — only `profiles` (and the
 * app_metadata mirror written by the database trigger).
 */
export async function requireUser(): Promise<AuthedUser> {
  if (!isSupabaseConfigured()) {
    throw new HttpError(503, "Supabase is not configured on this server.");
  }
  const supabase = await createServerSupabase();
  if (!supabase) throw new HttpError(503, "Supabase is not configured on this server.");

  const bearer = await readRequestAccessToken();
  const { userId, email: emailFromClaims } = await resolveUserIdFromAuth(supabase, bearer || undefined);

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, email, display_name, role")
    .eq("id", userId)
    .maybeSingle();

  if (profileError) {
    throw new HttpError(500, publicErrorMessage(profileError, "Не удалось загрузить профиль."));
  }
  if (!profile || !isUserRole(profile.role)) {
    throw new HttpError(403, "Профиль не найден. Завершите регистрацию.");
  }

  return {
    id: profile.id,
    email: profile.email || emailFromClaims,
    name: profile.display_name ?? undefined,
    role: profile.role,
  };
}

export async function requireUserResponse(): Promise<
  { user: AuthedUser; error?: undefined } | { user?: undefined; error: Response }
> {
  try {
    const user = await requireUser();
    return { user };
  } catch (err) {
    if (err instanceof HttpError) return { error: jsonError(err.status, err.message) };
    return { error: jsonError(500, publicErrorMessage(err, "Не удалось проверить вход.")) };
  }
}

export function requireRole(user: AuthedUser, role: UserRole): void {
  if (user.role !== role) {
    throw new HttpError(403, "Недостаточно прав для этого действия.");
  }
}

export { jsonError };
