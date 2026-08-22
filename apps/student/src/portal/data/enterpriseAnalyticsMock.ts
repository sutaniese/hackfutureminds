/** Агрегированная аналитика потока 500+ (демо для жюри) */
export const ENTERPRISE_FLOW_STATS = {
  cohortSize: 524,
  /** Сумма подтверждённых грантов/стипендий за учебный год (₸) */
  totalGrantsAwardedKzt: 128_400_000,
  /** Доля учеников с подтверждённым зачислением / оффером (условная метрика ROI) */
  admissionOrOfferRate: 0.34,
  /** Динамика начисленных грантов по месяцам (млн ₸) */
  grantVolumeByMonth: [
    { month: 'сен', mln: 4.2 },
    { month: 'окт', mln: 6.8 },
    { month: 'ноя', mln: 9.1 },
    { month: 'дек', mln: 11.4 },
    { month: 'янв', mln: 14.0 },
    { month: 'фев', mln: 16.2 },
  ],
  /** Топ профессий по выбору потока */
  topProfessions: [
    { name: 'IT / Software', count: 118 },
    { name: 'Медицина', count: 86 },
    { name: 'Инженерия', count: 74 },
    { name: 'Экономика / финансы', count: 62 },
    { name: 'Педагогика', count: 41 },
    { name: 'Прочее', count: 143 },
  ],
  /** Воронка статусов (для pie) */
  pipelineStages: [
    { name: 'Оффер / зачисление', value: 178, fill: 'var(--pw-accent)' },
    { name: 'В работе', value: 246, fill: '#94a3b8' },
    { name: 'Без статуса', value: 100, fill: '#cbd5e1' },
  ],
}
