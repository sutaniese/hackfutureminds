/**
 * Built-in grant rows for API/UI fallback (same data as live-grants.json).
 * Kept as .ts so Vercel serverless bundles always include it (avoids JSON trace edge cases).
 */

export type LiveGrantFallbackRow = {
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

export const LIVE_GRANTS_FALLBACK: readonly LiveGrantFallbackRow[] = [
  {
    id: "hungary_intergovernmental_grants",
    name: "Межправительственные гранты — квота Венгрии (Stipendium Hungaricum)",
    name_kz: null,
    country: "Венгрия",
    type: "full",
    amount_kzt: null,
    amount_usd: null,
    amount_label: "Всего 250 грантов",
    level: "any",
    fields: ["any"],
    eligible: ["top_applicants"],
    gpa_min: null,
    language_req: "венгерский, английский или французский",
    deadline_month: "December",
    deadline_label: "Декабрь – январь, ежегодно",
    url: "https://bolashak.gov.kz/ru/strany-predostavlyayushchie-granty",
    source: "bolashak.gov.kz",
    last_updated: "2026-04-26",
  },
  {
    id: "bolashak_bachelor",
    name: "Болашак — бакалавриат",
    name_kz: null,
    country: "Казахстан",
    type: "full",
    amount_kzt: null,
    amount_usd: null,
    amount_label: null,
    level: "bachelor",
    fields: ["any"],
    eligible: ["school_graduates", "college_students", "top_applicants"],
    gpa_min: 4.0,
    language_req: null,
    deadline_month: null,
    deadline_label: null,
    url: "https://bolashak.gov.kz/ru/usloviya-i-dokumenty",
    source: "bolashak.gov.kz",
    last_updated: "2026-04-26",
  },
  {
    id: "bolashak_master",
    name: "Болашак — магистратура",
    name_kz: null,
    country: "Казахстан",
    type: "full",
    amount_kzt: null,
    amount_usd: null,
    amount_label: null,
    level: "master",
    fields: ["any"],
    eligible: ["bachelor_graduates", "final_year_university_students"],
    gpa_min: 3.0,
    language_req: null,
    deadline_month: null,
    deadline_label: null,
    url: "https://bolashak.gov.kz/ru/usloviya-i-dokumenty",
    source: "bolashak.gov.kz",
    last_updated: "2026-04-26",
  },
  {
    id: "bolashak_phd",
    name: "Болашак — докторантура",
    name_kz: null,
    country: "Казахстан",
    type: "full",
    amount_kzt: null,
    amount_usd: null,
    amount_label: null,
    level: "phd",
    fields: ["any"],
    eligible: ["master_graduates", "final_year_master_students"],
    gpa_min: 3.0,
    language_req: null,
    deadline_month: null,
    deadline_label: null,
    url: "https://bolashak.gov.kz/ru/usloviya-i-dokumenty",
    source: "bolashak.gov.kz",
    last_updated: "2026-04-26",
  },
];
