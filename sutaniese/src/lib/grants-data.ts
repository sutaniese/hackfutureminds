import raw from "../../api/grants.json";
import type { GrantRecord } from "@/types/grants";

const GRANTS = raw as readonly GrantRecord[];

/**
 * All hardcoded programs from `api/grants.json` (imported as JSON, typed at
 * the boundary for `/api/generate` and UI in later steps).
 */
export const ALL_GRANTS: readonly GrantRecord[] = GRANTS;

export function allGrants(): readonly GrantRecord[] {
  return GRANTS;
}

export function getGrantById(id: string): GrantRecord | undefined {
  return GRANTS.find((g) => g.id === id);
}

export function grantCount(): number {
  return GRANTS.length;
}
