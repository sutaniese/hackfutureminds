import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, unlinkSync } from 'fs'
import { dirname, join, resolve } from 'path'

/**
 * Persistent JSON-store + Obsidian-style markdown vault on disk.
 * Local-only, dev-friendly: ten-vault/ next to project root.
 *
 * Layout:
 *   ten-vault/
 *     db.json                  — all entities (students, classes, conversations)
 *     students/<id>/profile.md — Obsidian-готовый MD по студенту (источник памяти агента)
 *     students/<id>/notes/*.md — заметки/мемоарка пользователя (writable)
 *     classes/<id>.md          — обзор класса
 */
export type Lang = 'kk' | 'ru' | 'en'

export type CareerMapItem = {
  title: string
  salary: string
  path: string
  vacancies?: string[]
}

export type GrantItem = {
  name: string
  amount: number
  amountLabel: string
  deadline: string
  currency: 'KZT' | 'USD' | 'EUR'
  amountMonthlyKzt: number
}

export type FinancialRoute = {
  monthly_cost: number
  grants: GrantItem[]
  gap: number
  coverage_percent: number
}

export type StudentProfile = {
  id: string
  displayName: string
  age: number
  city: string
  interests: string[]
  achievements: string[]
  target_university: string
  language: Lang
  primaryCareerTitle: string
  career_map: CareerMapItem[]
  financial_route: FinancialRoute
  portfolio_block: string
  /** Кому принадлежит — class id (опционально) */
  classId?: string | null
  /** Прошёл ли онбординг */
  onboardingComplete: boolean
  needsFinancialHelp?: boolean
  createdAt: string
  updatedAt: string
}

export type TeacherClass = {
  id: string
  name: string
  inviteCode: string
  /** ID учеников */
  studentIds: string[]
  createdAt: string
}

export type ChatMessage = {
  role: 'user' | 'assistant'
  text: string
  ts: string
}

export type Conversation = {
  id: string
  studentId: string
  messages: ChatMessage[]
  updatedAt: string
}

export type DBShape = {
  students: Record<string, StudentProfile>
  classes: Record<string, TeacherClass>
  conversations: Record<string, Conversation>
}

const ROOT = resolve(process.cwd(), 'ten-vault')
const DB_PATH = join(ROOT, 'db.json')

function ensureDir(p: string) {
  if (!existsSync(p)) mkdirSync(p, { recursive: true })
}

function readDb(): DBShape {
  ensureDir(ROOT)
  if (!existsSync(DB_PATH)) {
    const empty: DBShape = { students: {}, classes: {}, conversations: {} }
    writeFileSync(DB_PATH, JSON.stringify(empty, null, 2), 'utf8')
    return empty
  }
  try {
    const raw = readFileSync(DB_PATH, 'utf8')
    const parsed = JSON.parse(raw) as DBShape
    return {
      students: parsed.students ?? {},
      classes: parsed.classes ?? {},
      conversations: parsed.conversations ?? {},
    }
  } catch {
    return { students: {}, classes: {}, conversations: {} }
  }
}

function writeDb(db: DBShape) {
  ensureDir(ROOT)
  writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf8')
}

function studentDir(id: string) {
  return join(ROOT, 'students', id)
}

function studentProfilePath(id: string) {
  return join(studentDir(id), 'profile.md')
}

function studentNotesDir(id: string) {
  return join(studentDir(id), 'notes')
}

function classMdPath(id: string) {
  return join(ROOT, 'classes', `${id}.md`)
}

function nowIso() {
  return new Date().toISOString()
}

function uid(prefix: string) {
  if (typeof globalThis.crypto !== 'undefined' && 'randomUUID' in globalThis.crypto) {
    return `${prefix}-${(globalThis.crypto as Crypto).randomUUID()}`
  }
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

export function generateInviteCode(existing: Set<string>): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  for (let attempt = 0; attempt < 50; attempt++) {
    let s = 'TN-'
    for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)]
    if (!existing.has(s)) return s
  }
  return `TN-${Date.now().toString(36).toUpperCase().slice(-6)}`
}

function formatStudentMarkdown(s: StudentProfile, classCtx?: TeacherClass): string {
  const fm = [
    '---',
    `id: ${s.id}`,
    `displayName: ${s.displayName}`,
    `age: ${s.age}`,
    `city: ${s.city}`,
    `language: ${s.language}`,
    `target_university: "${s.target_university.replace(/"/g, '\\"')}"`,
    `primary_career: "${s.primaryCareerTitle.replace(/"/g, '\\"')}"`,
    `class: ${classCtx ? `"${classCtx.name}"` : 'null'}`,
    `class_invite_code: ${classCtx?.inviteCode ?? 'null'}`,
    `onboarding_complete: ${s.onboardingComplete}`,
    `needs_financial_help: ${s.needsFinancialHelp ?? false}`,
    `tags: [student, ${s.interests.map((x) => x.replace(/\s+/g, '-')).join(', ')}]`,
    `updated: ${s.updatedAt}`,
    '---',
    '',
  ].join('\n')

  const interests = s.interests.length ? s.interests.map((x) => `- ${x}`).join('\n') : '_нет_'
  const achievements = s.achievements.length ? s.achievements.map((x) => `- ${x}`).join('\n') : '_нет_'
  const careerLines = s.career_map.length
    ? s.career_map
        .map(
          (c) =>
            `- **${c.title}** — ${c.salary}\n  - путь: ${c.path}${c.vacancies?.length ? `\n  - роли: ${c.vacancies.join(', ')}` : ''}`,
        )
        .join('\n')
    : '_не заполнено_'
  const grants = s.financial_route.grants.length
    ? s.financial_route.grants
        .map(
          (g) =>
            `- **${g.name}** — ${g.amountLabel} (~${g.amountMonthlyKzt.toLocaleString('ru-RU')} ₸/мес), дедлайн: ${g.deadline}`,
        )
        .join('\n')
    : '_нет в плане_'

  return `${fm}# ${s.displayName}

> Этот файл — память AI-ассистента **ten** для конкретного ученика. Vault-стиль (Obsidian).
> Свободно редактируй, добавляй заметки в \`notes/\`. Все изменения видны агенту.

## Профиль

- Возраст: **${s.age}**
- Город: **${s.city}**
- Целевой вуз: **${s.target_university}**
- Язык интерфейса: **${s.language}**
- Класс: ${classCtx ? `[[${classCtx.name}]] (${classCtx.inviteCode})` : '_нет_'}

## Интересы
${interests}

## Достижения
${achievements}

## Карьерная карта
**Главное направление:** ${s.primaryCareerTitle || '_не выбрано_'}

${careerLines}

## Финансовый маршрут
- Месячная стоимость: **${s.financial_route.monthly_cost.toLocaleString('ru-RU')} ₸**
- Покрытие грантами: **${s.financial_route.coverage_percent}%**
- Разрыв (gap): **${s.financial_route.gap.toLocaleString('ru-RU')} ₸**

### Гранты
${grants}

## Портфолио-блок
${s.portfolio_block || '_не сгенерирован_'}

## Связанные заметки
- См. \`students/${s.id}/notes/\`
`
}

function formatClassMarkdown(c: TeacherClass, students: StudentProfile[]): string {
  const fm = [
    '---',
    `id: ${c.id}`,
    `name: "${c.name.replace(/"/g, '\\"')}"`,
    `invite_code: ${c.inviteCode}`,
    `student_count: ${c.studentIds.length}`,
    `created: ${c.createdAt}`,
    'tags: [class, ten]',
    '---',
    '',
  ].join('\n')
  const lines = students
    .map(
      (s) =>
        `- [[${s.displayName}]] (id: ${s.id}) — ${s.primaryCareerTitle || '—'}, онбординг: ${s.onboardingComplete ? '✅' : '⏳'}`,
    )
    .join('\n')
  return `${fm}# ${c.name}

Код приглашения: \`${c.inviteCode}\`

## Ученики
${lines || '_никого_'}
`
}

function persistStudentMarkdown(s: StudentProfile, db: DBShape) {
  ensureDir(studentDir(s.id))
  ensureDir(studentNotesDir(s.id))
  const cls = s.classId ? db.classes[s.classId] : undefined
  writeFileSync(studentProfilePath(s.id), formatStudentMarkdown(s, cls), 'utf8')
}

function persistClassMarkdown(c: TeacherClass, db: DBShape) {
  ensureDir(dirname(classMdPath(c.id)))
  const ss = c.studentIds.map((id) => db.students[id]).filter(Boolean) as StudentProfile[]
  writeFileSync(classMdPath(c.id), formatClassMarkdown(c, ss), 'utf8')
}

/* ─────────────────────────  Public API  ───────────────────────── */

export function listStudents(): StudentProfile[] {
  return Object.values(readDb().students).sort((a, b) => a.displayName.localeCompare(b.displayName))
}

export function getStudent(id: string): StudentProfile | undefined {
  return readDb().students[id]
}

const DEFAULT_FINROUTE: FinancialRoute = {
  monthly_cost: 100000,
  grants: [],
  gap: 100000,
  coverage_percent: 0,
}

export function upsertStudent(input: Partial<StudentProfile> & { displayName?: string; id?: string }): StudentProfile {
  const db = readDb()
  const id = input.id ?? uid('stu')
  const prev = db.students[id]
  const merged: StudentProfile = {
    id,
    displayName: input.displayName ?? prev?.displayName ?? 'Без имени',
    age: input.age ?? prev?.age ?? 16,
    city: input.city ?? prev?.city ?? '—',
    interests: input.interests ?? prev?.interests ?? [],
    achievements: input.achievements ?? prev?.achievements ?? [],
    target_university: input.target_university ?? prev?.target_university ?? '',
    language: (input.language ?? prev?.language ?? 'ru') as Lang,
    primaryCareerTitle: input.primaryCareerTitle ?? prev?.primaryCareerTitle ?? '',
    career_map: input.career_map ?? prev?.career_map ?? [],
    financial_route: input.financial_route ?? prev?.financial_route ?? DEFAULT_FINROUTE,
    portfolio_block: input.portfolio_block ?? prev?.portfolio_block ?? '',
    classId: input.classId !== undefined ? input.classId : (prev?.classId ?? null),
    onboardingComplete: input.onboardingComplete ?? prev?.onboardingComplete ?? false,
    needsFinancialHelp: input.needsFinancialHelp ?? prev?.needsFinancialHelp ?? false,
    createdAt: prev?.createdAt ?? nowIso(),
    updatedAt: nowIso(),
  }
  db.students[id] = merged
  if (merged.classId) {
    const cls = db.classes[merged.classId]
    if (cls && !cls.studentIds.includes(id)) {
      cls.studentIds.push(id)
    }
  }
  writeDb(db)
  persistStudentMarkdown(merged, db)
  if (merged.classId && db.classes[merged.classId]) {
    persistClassMarkdown(db.classes[merged.classId], db)
  }
  return merged
}

export function deleteStudent(id: string): boolean {
  const db = readDb()
  const s = db.students[id]
  if (!s) return false
  delete db.students[id]
  Object.values(db.classes).forEach((c) => {
    c.studentIds = c.studentIds.filter((x) => x !== id)
  })
  writeDb(db)
  return true
}

export function listClasses(): TeacherClass[] {
  return Object.values(readDb().classes).sort((a, b) => a.name.localeCompare(b.name))
}

export function getClass(id: string): TeacherClass | undefined {
  return readDb().classes[id]
}

export function findClassByInvite(code: string): TeacherClass | undefined {
  return Object.values(readDb().classes).find((c) => c.inviteCode.toUpperCase() === code.toUpperCase())
}

export function createClass(name: string): TeacherClass {
  const db = readDb()
  const id = uid('cls')
  const codes = new Set(Object.values(db.classes).map((c) => c.inviteCode))
  const cls: TeacherClass = {
    id,
    name: name.trim() || 'Класс без названия',
    inviteCode: generateInviteCode(codes),
    studentIds: [],
    createdAt: nowIso(),
  }
  db.classes[id] = cls
  writeDb(db)
  persistClassMarkdown(cls, db)
  return cls
}

export function deleteClass(id: string): boolean {
  const db = readDb()
  if (!db.classes[id]) return false
  delete db.classes[id]
  Object.values(db.students).forEach((s) => {
    if (s.classId === id) s.classId = null
  })
  writeDb(db)
  return true
}

/* ─── Notes (Obsidian writable) ─── */

export type StudentNote = {
  fileName: string
  title: string
  content: string
  updatedAt: string
}

export function listStudentNotes(studentId: string): StudentNote[] {
  const dir = studentNotesDir(studentId)
  if (!existsSync(dir)) return []
  const files = readdirSync(dir).filter((f) => f.endsWith('.md'))
  return files.map((fileName) => {
    const full = join(dir, fileName)
    const content = readFileSync(full, 'utf8')
    const titleLine = content.split(/\r?\n/).find((l) => l.startsWith('# '))
    return {
      fileName,
      title: titleLine ? titleLine.replace(/^#\s+/, '') : fileName.replace(/\.md$/, ''),
      content,
      updatedAt: '', // быстрая выдача без stat
    }
  })
}

export function readStudentNote(studentId: string, fileName: string): string | null {
  const safe = sanitizeFileName(fileName)
  if (!safe) return null
  const full = join(studentNotesDir(studentId), safe)
  if (!existsSync(full)) return null
  return readFileSync(full, 'utf8')
}

export function saveStudentNote(studentId: string, title: string, content: string, fileName?: string): StudentNote {
  ensureDir(studentNotesDir(studentId))
  const name = sanitizeFileName(fileName ?? `${title || 'note'}.md`) || `note-${Date.now()}.md`
  const full = join(studentNotesDir(studentId), name)
  const body = content.startsWith('# ') ? content : `# ${title || name}\n\n${content}\n`
  writeFileSync(full, body, 'utf8')
  return { fileName: name, title: title || name.replace(/\.md$/, ''), content: body, updatedAt: nowIso() }
}

export function deleteStudentNote(studentId: string, fileName: string): boolean {
  const safe = sanitizeFileName(fileName)
  if (!safe) return false
  const full = join(studentNotesDir(studentId), safe)
  if (!existsSync(full)) return false
  unlinkSync(full)
  return true
}

function sanitizeFileName(input: string): string {
  let name = input.trim().replace(/[\\/]+/g, '_').replace(/[^\wа-яА-ЯёЁ.\- ]+/gi, '')
  if (!name.toLowerCase().endsWith('.md')) name = `${name}.md`
  if (name.length > 120) name = name.slice(0, 120)
  return name
}

/* ─── Conversations (история чата) ─── */

export function getConversation(studentId: string): Conversation {
  const db = readDb()
  const existing = Object.values(db.conversations).find((c) => c.studentId === studentId)
  if (existing) return existing
  const c: Conversation = {
    id: uid('conv'),
    studentId,
    messages: [],
    updatedAt: nowIso(),
  }
  db.conversations[c.id] = c
  writeDb(db)
  return c
}

export function appendChatMessage(studentId: string, msg: ChatMessage): Conversation {
  const db = readDb()
  let conv = Object.values(db.conversations).find((c) => c.studentId === studentId)
  if (!conv) {
    conv = { id: uid('conv'), studentId, messages: [], updatedAt: nowIso() }
    db.conversations[conv.id] = conv
  }
  conv.messages.push(msg)
  conv.updatedAt = nowIso()
  writeDb(db)
  return conv
}

export function clearConversation(studentId: string): void {
  const db = readDb()
  const conv = Object.values(db.conversations).find((c) => c.studentId === studentId)
  if (conv) conv.messages = []
  writeDb(db)
}

/* ─── Vault paths и сводный markdown для агента ─── */

export function getVaultRoot(): string {
  return ROOT
}

export function getStudentVaultMarkdown(studentId: string): {
  profile: string
  notes: StudentNote[]
} | null {
  const s = getStudent(studentId)
  if (!s) return null
  const profile = existsSync(studentProfilePath(s.id))
    ? readFileSync(studentProfilePath(s.id), 'utf8')
    : formatStudentMarkdown(s, s.classId ? readDb().classes[s.classId] : undefined)
  const notes = listStudentNotes(s.id)
  return { profile, notes }
}

/* ─── Seed: первый запуск кладёт двух демо-учеников + класс ─── */

export function seedIfEmpty(): void {
  const db = readDb()
  if (Object.keys(db.students).length > 0 || Object.keys(db.classes).length > 0) return
  const cls = createClass('10«А» — профориентация (демо)')
  const seedDb = readDb()
  const seedClass = seedDb.classes[cls.id]!
  // Айгерим
  upsertStudent({
    id: 'aigerim-demo',
    displayName: 'Айгерим К.',
    age: 17,
    city: 'Алматы',
    interests: ['биология', 'химия', 'медицина'],
    achievements: ['2 место — республиканская олимпиада по биологии'],
    target_university: 'Назарбаев Университет / медицина, Астана',
    language: 'ru',
    primaryCareerTitle: 'Врач-исследователь',
    classId: seedClass.id,
    onboardingComplete: true,
    needsFinancialHelp: false,
    career_map: [
      {
        title: 'Биомедицинский инженер',
        salary: '450 000 – 700 000 ₸',
        path: 'STEM → R&D в фарме/диагностике',
        vacancies: ['Инженер-лаборант', 'Specialist QA'],
      },
      {
        title: 'Врач-исследователь',
        salary: '600 000 – 1 200 000 ₸',
        path: 'Мед. университет → ординатура',
      },
    ],
    financial_route: {
      monthly_cost: 180000,
      grants: [
        {
          name: 'Болашак',
          amount: 800,
          amountLabel: '~$800/мес',
          deadline: 'ноябрь',
          currency: 'USD',
          amountMonthlyKzt: 360000,
        },
        {
          name: 'НАО грант (КЗ)',
          amount: 4,
          amountLabel: 'до 4 МРП/мес',
          deadline: 'июль',
          currency: 'KZT',
          amountMonthlyKzt: 60000,
        },
      ],
      gap: 60000,
      coverage_percent: 67,
    },
    portfolio_block:
      'Призёр республиканской олимпиады по биологии (топ 3%, 340 участников).',
  })
  upsertStudent({
    id: 'daniyar-demo',
    displayName: 'Данияр Н.',
    age: 16,
    city: 'Шымкент',
    interests: ['математика', 'робототехника'],
    achievements: ['KazRoboProject — финалист'],
    target_university: 'Satbayev University',
    language: 'kk',
    primaryCareerTitle: 'Инженер-программист (embedded)',
    classId: seedClass.id,
    onboardingComplete: true,
    needsFinancialHelp: true,
    career_map: [
      { title: 'Инженер встроенных систем', salary: '500 000 – 900 000 ₸', path: 'Мехатроника → IoT' },
      { title: 'Data / MLOps', salary: '450 000 – 800 000 ₸', path: 'CS → продуктовые команды' },
    ],
    financial_route: {
      monthly_cost: 120000,
      grants: [
        {
          name: 'KAZNEX INVEST (tech)',
          amount: 0,
          amountLabel: 'переменная',
          deadline: 'апрель',
          currency: 'KZT',
          amountMonthlyKzt: 80000,
        },
      ],
      gap: 40000,
      coverage_percent: 67,
    },
    portfolio_block: 'Финалист инженерного конкурса KazRoboProject.',
  })
}
