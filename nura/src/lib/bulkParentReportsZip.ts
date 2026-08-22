import JSZip from 'jszip'
import type { EnterpriseCohortMember } from '../data/enterpriseCohort'

function sanitizeFilePart(s: string) {
  return s.replace(/[^\wа-яА-ЯёЁ.-]+/gi, '_').slice(0, 48)
}

function buildReportText(m: EnterpriseCohortMember, tenantName: string) {
  return [
    `PathWise — персональный отчёт для родителей`,
    `Центр (white-label): ${tenantName}`,
    '',
    `Ученик: ${m.displayName}`,
    `ID: ${m.id}`,
    `Ключевое направление: ${m.primaryProfession}`,
    `Оценка грантов (демо): ${m.grantsSecuredKzt.toLocaleString('ru-RU')} ₸`,
    '',
    m.parentSummary,
    '',
    '---',
    'Документ сформирован автоматически (MVP хакатона).',
  ].join('\n')
}

export async function downloadBulkParentReportsZip(
  members: EnterpriseCohortMember[],
  tenantName: string,
) {
  const zip = new JSZip()
  const folder = zip.folder('otchyoty_roditelyam')
  if (!folder) throw new Error('zip folder')

  for (const m of members) {
    const name = `otchet_${sanitizeFilePart(m.id)}.txt`
    folder.file(name, buildReportText(m, tenantName))
  }

  folder.file(
    '00_spisok.txt',
    ['Список файлов в архиве:', ...members.map((x) => `- ${x.displayName} (${x.id})`)].join('\n'),
  )

  const blob = await zip.generateAsync({ type: 'blob' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `PathWise_bulk_roditeli_${sanitizeFilePart(tenantName)}.zip`
  a.click()
  URL.revokeObjectURL(url)
}
