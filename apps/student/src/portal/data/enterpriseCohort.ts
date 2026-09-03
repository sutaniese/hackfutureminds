/** Live cohort members for bulk parent reports. Empty until a real class is attached. */
export type EnterpriseCohortMember = {
  id: string
  displayName: string
  primaryProfession: string
  grantsSecuredKzt: number
  parentSummary: string
}

export const ENTERPRISE_COHORT: EnterpriseCohortMember[] = []
