/**
 * Hardcoded grant program rows in `api/grants.json` — Kazakhstan context +
 * match hints for `/api/generate` and UI.
 */
export type GrantType = "monthly" | "full" | "lump" | "one_time";

export type GrantRecord = {
  id: string;
  name: string;
  type: GrantType;
  /** If known, main monthly value in KZT; null e.g. for some full-ride rows */
  monthlyKzt: number | null;
  amountUsd: number | null;
  amountEur: number | null;
  /** e.g. "full coverage" when not monthly */
  amountNarrative: string | null;
  deadline: string;
  url: string;
  /** Searchable tags for simple matching in demo */
  eligibilityTags: string[];
  /** Why it matters to students from Kazakhstan */
  kazakhstanRelevance: string;
  /** Shorter text we can show as “match reason” before AI (step 5) */
  suggestedMatchBlurb: string;
  /** For stacking demo: assumed monthly KZT that counts toward the gap (0 = informational only) */
  coverageContributionKzt: number;
};
