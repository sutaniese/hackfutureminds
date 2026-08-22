/** Упрощённые карточки учеников потока для массовых отчётов (демо, не все 524) */
export type EnterpriseCohortMember = {
  id: string
  displayName: string
  primaryProfession: string
  grantsSecuredKzt: number
  parentSummary: string
}

const FIRST = [
  'Айгерим',
  'Данияр',
  'Ерлан',
  'Алуа',
  'Мади',
  'Асхат',
  'Сабина',
  'Нұржан',
  'Елдос',
  'Камила',
  'Тимур',
  'Жанерке',
  'Бекзат',
  'Аружан',
  'Олжас',
]

const PROF = ['IT / Software', 'Медицина', 'Инженерия', 'Экономика', 'Педагогика', 'Право', 'Дизайн']

export const ENTERPRISE_COHORT: EnterpriseCohortMember[] = FIRST.flatMap((name, classIdx) => {
  const batch = [1, 2].map((n) => {
    const id = `ent-student-${classIdx}-${n}`
    const displayName = n === 1 ? `${name} К.` : `${name} Н.`
    const primaryProfession = PROF[(classIdx + n) % PROF.length]
    const grantsSecuredKzt = 400_000 + ((classIdx * 37 + n * 91) % 800) * 1000
    return {
      id,
      displayName,
      primaryProfession,
      grantsSecuredKzt,
      parentSummary: `Профиль PathWise: ${primaryProfession}. Подобраны гранты на сумму ~${(grantsSecuredKzt / 1_000_000).toFixed(1)} млн ₸ (демо). Рекомендуем обсудить финмаршрут на семейной встрече.`,
    } satisfies EnterpriseCohortMember
  })
  return batch
})
