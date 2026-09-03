/** Retired mock aggregates. Do not render these as live class data. */
export const ENTERPRISE_FLOW_STATS = {
  cohortSize: 0,
  totalGrantsAwardedKzt: 0,
  admissionOrOfferRate: 0,
  grantVolumeByMonth: [] as { month: string; mln: number }[],
  topProfessions: [] as { name: string; count: number }[],
  pipelineStages: [] as { name: string; value: number; fill: string }[],
}
