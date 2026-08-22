import type { TeacherClass } from '../types/teacher'

const OLYMPIAD_RE = /олимпиад|olympiad|\boi\b|physics|химия|биолог|математ/i

function isOlympiadRow(achievements: string[]) {
  return achievements.some((a) => OLYMPIAD_RE.test(a))
}

function escapeCsvCell(value: string) {
  if (/[",;\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`
  return value
}

/** Агрегированная статистика + построчно ученики (UTF-8 BOM для Excel) */
export function downloadClassAchievementsReport(klass: TeacherClass, filenameBase = 'class_report') {
  const olympiadCount = klass.students.filter((s) => isOlympiadRow(s.profile.achievements)).length

  const dirCounts = new Map<string, number>()
  for (const s of klass.students) {
    for (const d of s.careerDirections) {
      const key = d.trim() || '—'
      dirCounts.set(key, (dirCounts.get(key) ?? 0) + 1)
    }
  }
  const popular = [...dirCounts.entries()]
    .filter(([k]) => k !== '—')
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)

  const lines: string[] = []
  lines.push('PathWise;Экспорт достижений класса')
  lines.push(`Класс;${escapeCsvCell(klass.name)}`)
  lines.push(`Код приглашения;${klass.inviteCode}`)
  lines.push('')
  lines.push('Сводка;Значение')
  lines.push(`Всего учеников;${klass.students.length}`)
  lines.push(`Прошли онбординг;${klass.students.filter((s) => s.onboardingComplete).length}`)
  lines.push(`Олимпиадники (по ключевым словам в достижениях);${olympiadCount}`)
  lines.push('')
  lines.push('Популярные направления;Количество упоминаний')
  for (const [name, c] of popular) {
    lines.push(`${escapeCsvCell(name)};${c}`)
  }
  lines.push('')
  lines.push('Ученик;Онбординг;Направления;Нужна фин. помощь;Достижения (кратко)')
  for (const s of klass.students) {
    const ach = s.profile.achievements.join(' | ')
    lines.push(
      [
        escapeCsvCell(s.profile.displayName),
        s.onboardingComplete ? 'да' : 'нет',
        escapeCsvCell(s.careerDirections.join(', ')),
        s.needsFinancialHelp ? 'да' : 'нет',
        escapeCsvCell(ach),
      ].join(';'),
    )
  }

  const csv = `\uFEFF${lines.join('\r\n')}`
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const safe = filenameBase.replace(/[^\wа-яА-ЯёЁ-]+/gi, '_').slice(0, 72)
  a.href = url
  a.download = `${safe}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
