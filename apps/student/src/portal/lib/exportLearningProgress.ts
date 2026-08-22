import { subjectTitle } from '@/lib/learning/catalog'
import { LEVEL_LABELS, type StudentLearningSnapshot } from '@/lib/learning/store'
import type { Topic } from '@/lib/learning/types'
import { SITE_NAME } from '../site'

function escapeCsvCell(value: string) {
  if (/[",;\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`
  return value
}

function topicTitle(topics: readonly Topic[], topicId: string) {
  return topics.find((topic) => topic.id === topicId)?.title ?? topicId
}

/** Выгрузка учебного прогресса класса в CSV (UTF-8 BOM — открывается в Excel). */
export function downloadLearningProgressReport(
  roster: readonly StudentLearningSnapshot[],
  topics: readonly Topic[],
  filenameBase = 'ten_learning_progress',
) {
  const count = roster.length || 1
  const avgMastery = Math.round(roster.reduce((sum, item) => sum + item.mastery, 0) / count)
  const avgAccuracy = Math.round(roster.reduce((sum, item) => sum + item.accuracy, 0) / count)
  const atRisk = roster.filter((item) => item.accuracy < 60).length

  const weakCounts = new Map<string, number>()
  for (const student of roster) {
    for (const topicId of student.weakTopics) {
      weakCounts.set(topicId, (weakCounts.get(topicId) ?? 0) + 1)
    }
  }
  const weakTop = [...weakCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8)

  const lines: string[] = []
  lines.push(`${SITE_NAME};Учебный прогресс класса`)
  lines.push('')
  lines.push('Сводка;Значение')
  lines.push(`Всего учеников;${roster.length}`)
  lines.push(`Среднее освоение, %;${avgMastery}`)
  lines.push(`Средняя точность, %;${avgAccuracy}`)
  lines.push(`В зоне риска (точность ниже 60%);${atRisk}`)
  lines.push('')
  lines.push('Проблемная тема;Сколько учеников')
  for (const [topicId, value] of weakTop) {
    lines.push(`${escapeCsvCell(topicTitle(topics, topicId))};${value}`)
  }
  lines.push('')
  lines.push('Ученик;Класс;Предмет;Уровень;Освоено, %;Точность, %;Решено заданий;Слабые темы')
  for (const student of roster) {
    lines.push(
      [
        escapeCsvCell(student.name || student.email),
        String(student.grade),
        escapeCsvCell(subjectTitle(student.subjectId)),
        escapeCsvCell(LEVEL_LABELS[student.level]),
        String(student.mastery),
        String(student.accuracy),
        String(student.solvedTasks),
        escapeCsvCell(student.weakTopics.map((id) => topicTitle(topics, id)).join(', ')),
      ].join(';'),
    )
  }

  const csv = `﻿${lines.join('\r\n')}`
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${filenameBase.replace(/[^\wа-яА-ЯёЁ-]+/gi, '_').slice(0, 72)}.csv`
  link.click()
  URL.revokeObjectURL(url)
}
