import { NextResponse } from "next/server";
import fallbackGrants from "@/data/live-grants.json";

export const runtime = "nodejs";

type LiveGrant = {
  id: string;
  name: string;
  name_kz: string | null;
  country: string;
  type: "monthly" | "full" | "one-time";
  amount_kzt: number | null;
  amount_usd: number | null;
  amount_label: string | null;
  level: "bachelor" | "master" | "phd" | "any";
  fields: string[];
  eligible: string[];
  gpa_min: number | null;
  language_req: string | null;
  deadline_month: string | null;
  deadline_label: string | null;
  url: string;
  source: string;
  last_updated: string;
};

const FIELD_ALIASES: Record<string, string[]> = {
  engineering: ["engineering", "technical", "it", "computer", "stem"],
  medicine: ["medicine", "medical", "health", "biology", "chemistry"],
  business: ["business", "finance", "econ", "management"],
  law: ["law", "policy", "international"],
  any: ["any"],
};

function fallbackData() {
  return fallbackGrants as LiveGrant[];
}

function matchesFilters(grant: LiveGrant, filters: Record<string, string | null>) {
  const fieldAliases = filters.field ? FIELD_ALIASES[filters.field] ?? [filters.field] : [];
  if (
    filters.field &&
    !grant.fields.includes("any") &&
    !grant.fields.some((field) => fieldAliases.includes(field))
  ) {
    return false;
  }
  if (filters.level && grant.level !== filters.level && grant.level !== "any") return false;
  if (filters.type && grant.type !== filters.type) return false;
  if (filters.country && grant.country !== filters.country) return false;
  return true;
}

async function fetchSupabaseGrants(filters: Record<string, string | null>) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !serviceKey) throw new Error("Supabase env vars are missing.");

  const url = new URL(`${supabaseUrl}/rest/v1/grants`);
  url.searchParams.set("select", "*");
  if (filters.type) url.searchParams.set("type", `eq.${filters.type}`);
  if (filters.country) url.searchParams.set("country", `eq.${filters.country}`);
  if (filters.level) url.searchParams.set("or", `(level.eq.${filters.level},level.eq.any)`);

  const response = await fetch(url, {
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
    },
    cache: "no-store",
  });
  const raw = await response.text().catch(() => "");
  if (!response.ok) {
    throw new Error(raw.slice(0, 400) || response.statusText || "Supabase request failed");
  }

  const trimmed = raw.trim();
  if (!trimmed || trimmed.startsWith("<")) {
    throw new Error("Supabase returned HTML or an empty body instead of JSON.");
  }
  let data: LiveGrant[];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) throw new Error("Supabase JSON was not an array");
    data = parsed as LiveGrant[];
  } catch {
    throw new Error("Supabase returned invalid JSON.");
  }
  if (!filters.field) return data;
  const fieldAliases = FIELD_ALIASES[filters.field] ?? [filters.field];
  return data.filter((grant) => grant.fields?.includes("any") || grant.fields?.some((field) => fieldAliases.includes(field)));
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const filters = {
    field: searchParams.get("field"),
    level: searchParams.get("level"),
    type: searchParams.get("type"),
    country: searchParams.get("country"),
  };

  try {
    const data = await fetchSupabaseGrants(filters);
    return NextResponse.json({ data, total: data.length, source: "live" });
  } catch (error) {
    try {
      const data = fallbackData().filter((grant) => matchesFilters(grant, filters));
      return NextResponse.json({
        data,
        total: data.length,
        source: "fallback",
        warning: error instanceof Error ? error.message : "Supabase unavailable",
      });
    } catch {
      return NextResponse.json(
        {
          data: [] as LiveGrant[],
          total: 0,
          source: "fallback",
          warning: "Catalog temporarily unavailable.",
        },
        { status: 200 },
      );
    }
  }
}
