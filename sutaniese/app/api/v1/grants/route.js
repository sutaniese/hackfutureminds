import { createClient } from "@supabase/supabase-js";
import fallbackGrants from "../../../../data/grants.json";

function createSupabaseServerClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !serviceKey) {
    throw new Error("Supabase environment variables are not configured.");
  }

  return createClient(supabaseUrl, serviceKey);
}

function matchesFallback(grant, filters) {
  if (filters.field && !(grant.fields || []).includes("any") && !(grant.fields || []).includes(filters.field)) {
    return false;
  }
  if (filters.level && grant.level !== filters.level && grant.level !== "any") return false;
  if (filters.type && grant.type !== filters.type) return false;
  if (filters.country && grant.country !== filters.country) return false;
  return true;
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const filters = {
    field: searchParams.get("field"),
    level: searchParams.get("level"),
    type: searchParams.get("type"),
    country: searchParams.get("country"),
  };

  try {
    const supabase = createSupabaseServerClient();
    let query = supabase.from("grants").select("*");

    if (filters.field) query = query.contains("fields", [filters.field]);
    if (filters.level) query = query.or(`level.eq.${filters.level},level.eq.any`);
    if (filters.type) query = query.eq("type", filters.type);
    if (filters.country) query = query.eq("country", filters.country);

    const { data, error } = await query;
    if (error) throw error;
    return Response.json({ data, total: data.length, source: "live" });
  } catch (error) {
    const data = fallbackGrants.filter((grant) => matchesFallback(grant, filters));
    return Response.json({
      data,
      total: data.length,
      source: "fallback",
      warning: error instanceof Error ? error.message : "Supabase unavailable",
    });
  }
}
