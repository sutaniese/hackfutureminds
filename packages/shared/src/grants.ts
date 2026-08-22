/**
 * Mirrors `apps/student/src/types/grants.ts`. Kept here so the parent calculator
 * in `apps/portal` can show identical fields without re-declaring the type.
 */

export type GrantType = "monthly" | "full" | "lump" | "one_time";

export type GrantRecord = {
  id: string;
  name: string;
  type: GrantType;
  monthlyKzt: number | null;
  amountUsd: number | null;
  amountEur: number | null;
  amountNarrative: string | null;
  deadline: string;
  url: string;
  eligibilityTags: string[];
  kazakhstanRelevance: string;
  suggestedMatchBlurb: string;
  coverageContributionKzt: number;
};
