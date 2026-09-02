import { isUserRole, type UserRole } from "@/lib/site-nav";
import { createServerSupabase } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

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

/**
 * Resolve the signed-in user from cookies and the RLS-protected profiles table.
 * Role is never read from user_metadata.
 */
export async function requireUser(): Promise<AuthedUser> {
  if (!isSupabaseConfigured()) {
    throw new HttpError(503, "Supabase is not configured on this server.");
  }
  const supabase = await createServerSupabase();
  if (!supabase) throw new HttpError(503, "Supabase is not configured on this server.");

  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims?.sub) {
    throw new HttpError(401, "Войдите в аккаунт.");
  }

  const userId = String(data.claims.sub);
  const emailFromClaims =
    typeof data.claims.email === "string" ? data.claims.email : "";

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, email, display_name, role")
    .eq("id", userId)
    .maybeSingle();

  if (profileError) {
    throw new HttpError(500, profileError.message);
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
    return { error: jsonError(500, err instanceof Error ? err.message : "Server error") };
  }
}

export function requireRole(user: AuthedUser, role: UserRole): void {
  if (user.role !== role) {
    throw new HttpError(403, "Недостаточно прав для этого действия.");
  }
}

export { jsonError };
