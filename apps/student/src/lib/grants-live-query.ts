import { LIVE_GRANTS_FALLBACK } from "@/data/live-grants-fallback-data";
import { jsonSafeClone } from "@/lib/json-safe";

export type LiveGrantRow = {
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

function fallbackData(): LiveGrantRow[] {
  return LIVE_GRANTS_FALLBACK.map((g) => ({ ...g })) as LiveGrantRow[];
}

function matchesFilters(grant: LiveGrantRow, filters: Record<string, string | null>) {
  const fields = Array.isArray(grant.fields) ? grant.fields : [];
  const fieldAliases = filters.field ? FIELD_ALIASES[filters.field] ?? [filters.field] : [];
  if (
    filters.field &&
    !fields.includes("any") &&
    !fields.some((field) => fieldAliases.includes(field))
  ) {
    return false;
  }
  if (filters.level && grant.level !== filters.level && grant.level !== "any") return false;
  if (filters.type && grant.type !== filters.type) return false;
  if (filters.country && grant.country !== filters.country) return false;
  return true;
}

async function fetchSupabaseGrants(filters: Record<string, string | null>) {
  const supabaseUrl =
    process.env.SUPABASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_KEY?.trim();
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
  let data: LiveGrantRow[];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) throw new Error("Supabase JSON was not an array");
    data = parsed as LiveGrantRow[];
  } catch {
    throw new Error("Supabase returned invalid JSON.");
  }
  const safe = jsonSafeClone(data);
  if (!filters.field) return safe;
  const fieldAliases = FIELD_ALIASES[filters.field] ?? [filters.field];
  return safe.filter(
    (grant) => {
      const fields = Array.isArray(grant.fields) ? grant.fields : [];
      return fields.includes("any") || fields.some((field) => fieldAliases.includes(field));
    },
  );
}

export type LiveGrantsQueryResult = {
  data: LiveGrantRow[];
  total: number;
  source: "live" | "fallback";
  warning?: string;
};

/**
 * Load grants for server-side use (Supabase when configured, else static JSON).
 * Do not call the HTTP `/api/v1/grants` route from other API routes — same-origin
 * fetch from a serverless function can deadlock or time out on Vercel.
 */
export async function queryLiveGrants(filters: {
  field: string | null;
  level: string | null;
  type: string | null;
  country: string | null;
}): Promise<LiveGrantsQueryResult> {
  const filtersRecord: Record<string, string | null> = {
    field: filters.field,
    level: filters.level,
    type: filters.type,
    country: filters.country,
  };

  try {
    const data = await fetchSupabaseGrants(filtersRecord);
    return { data, total: data.length, source: "live" };
  } catch (error) {
    try {
      const data = fallbackData().filter((grant) => matchesFilters(grant, filtersRecord));
      return {
        data,
        total: data.length,
        source: "fallback",
        warning: error instanceof Error ? error.message : "Supabase unavailable",
      };
    } catch {
      return {
        data: [],
        total: 0,
        source: "fallback",
        warning: "Catalog temporarily unavailable.",
      };
    }
  }
}
