import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { listPublicUsers, subscribeAuth } from '@/lib/auth'
import { readStudentProfiles, type StudentProfileSnapshot } from '@/lib/student-profile-store'
import { api, type ServerStudent } from '../lib/api'
import { asArray } from '@/lib/safe-list'

type Ctx = {
  students: ServerStudent[]
  loading: boolean
  error: string | null
  activeStudentId: string | null
  activeStudent: ServerStudent | null
  setActiveStudentId: (id: string | null) => void
  reload: () => Promise<void>
  upsertLocal: (s: ServerStudent) => void
  removeLocal: (id: string) => void
}

const StudentContext = createContext<Ctx | null>(null)
const STORAGE_KEY = 'ten:activeStudentId'

function splitAchievements(value?: string): string[] {
  return (value ?? '')
    .split(/[\n,;]+/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function mapLocalProfileToStudent(profile: StudentProfileSnapshot, fallbackName?: string): ServerStudent {
  const onboarding = profile.onboarding
  const generated = profile.generated
  const careerMap = generated?.career_map ?? []
  const financialRoute = generated?.financial_route

  return {
    id: profile.email,
    displayName: profile.name || fallbackName || profile.email,
    age: 16,
    city: onboarding?.city || '—',
    interests: onboarding?.subjectIds.length ? onboarding.subjectIds : ['анкета не заполнена'],
    achievements: splitAchievements(onboarding?.achievements),
    target_university: onboarding?.studyLocation === 'abroad' ? 'Зарубежные программы' : 'Казахстанские вузы',
    language: 'ru',
    primaryCareerTitle: careerMap[0]?.title ?? 'План ещё не создан',
    career_map: careerMap.length
      ? careerMap.map((item) => ({
          title: item.title,
          salary: item.salary_kzt,
          path: item.description,
          vacancies: item.vacancies?.map((vacancy) => `${vacancy.title} · ${vacancy.company}`) ?? [],
        }))
      : [
          {
            title: 'План ещё не создан',
            salary: '—',
            path: 'Попросите ученика открыть страницу “План” и нажать “Создать”.',
            vacancies: [],
          },
        ],
    financial_route: financialRoute
      ? {
          monthly_cost: financialRoute.monthly_cost,
          gap: financialRoute.gap,
          coverage_percent: financialRoute.coverage_percent,
          grants: financialRoute.grants.map((grant) => ({
            name: grant.name,
            amount: grant.amount,
            amountLabel: `${grant.amount.toLocaleString('ru-RU')} ₸`,
            deadline: grant.deadline,
            currency: 'KZT',
            amountMonthlyKzt: grant.amount,
          })),
        }
      : {
          monthly_cost: 0,
          gap: 0,
          coverage_percent: 0,
          grants: [],
        },
    portfolio_block: generated?.portfolio_block || 'Портфолио-блок появится после генерации плана учеником.',
    onboardingComplete: Boolean(onboarding),
    needsFinancialHelp: Boolean(onboarding?.budgetConstraints.trim()),
    createdAt: new Date(profile.updatedAt).toISOString(),
    updatedAt: new Date(profile.updatedAt).toISOString(),
  }
}

function localStudentProfiles(): ServerStudent[] {
  const profiles = readStudentProfiles()
  const users = listPublicUsers('student')
  const sessionFallback = users.length === 1 ? readSessionProfileFallback(users[0].email, users[0].name) : null

  return users.map((user) => {
    const snapshot = profiles[user.email] ?? sessionFallback ?? {
      email: user.email,
      name: user.name,
      accessibilitySupport: user.accessibilitySupport,
      updatedAt: user.createdAt,
    }
    return mapLocalProfileToStudent(snapshot, user.name)
  })
}

function readSessionProfileFallback(email: string, name?: string): StudentProfileSnapshot | null {
  try {
    const onboardingRaw = sessionStorage.getItem('pathwise-onboarding-answers')
    const generatedRaw = sessionStorage.getItem('pathwise-last-generate')
    const onboarding = onboardingRaw ? JSON.parse(onboardingRaw) : undefined
    const generatedPayload = generatedRaw ? JSON.parse(generatedRaw) : undefined
    const generated = generatedPayload?.data
    if (!onboarding && !generated) return null
    return {
      email,
      name,
      onboarding,
      generated,
      updatedAt: Date.now(),
    }
  } catch {
    return null
  }
}

function mergeStudents(serverStudents: ServerStudent[], localStudents: ServerStudent[]) {
  const byId = new Map<string, ServerStudent>()
  for (const student of serverStudents) byId.set(student.id, student)
  for (const student of localStudents) byId.set(student.id, student)
  return [...byId.values()]
}

/** Push browser-local student profiles into the server vault (required for AI coach API). */
async function syncLocalStudentsToServer(
  serverStudents: ServerStudent[],
  localStudents: ServerStudent[],
): Promise<ServerStudent[]> {
  const serverById = new Map(serverStudents.map((s) => [s.id, s]))
  const synced = [...serverStudents]

  for (const local of localStudents) {
    const existing = serverById.get(local.id)
    if (!existing) {
      try {
        const saved = await api.upsertStudent(local)
        serverById.set(saved.id, saved)
        synced.push(saved)
      } catch {
        /* keep local-only in UI if vault write fails */
      }
      continue
    }

    const localTs = Date.parse(local.updatedAt ?? '')
    const serverTs = Date.parse(existing.updatedAt ?? '')
    if (Number.isFinite(localTs) && (!Number.isFinite(serverTs) || localTs > serverTs)) {
      try {
        const saved = await api.upsertStudent({ ...existing, ...local, id: local.id })
        serverById.set(saved.id, saved)
        const idx = synced.findIndex((s) => s.id === saved.id)
        if (idx >= 0) synced[idx] = saved
      } catch {
        /* keep server copy */
      }
    }
  }

  return mergeStudents(synced, localStudents)
}

export function StudentProvider({ children }: { children: ReactNode }) {
  const [students, setStudents] = useState<ServerStudent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeStudentId, setActiveStudentIdRaw] = useState<string | null>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY)
    } catch {
      return null
    }
  })

  const setActiveStudentId = useCallback((id: string | null) => {
    setActiveStudentIdRaw(id)
    try {
      if (id) localStorage.setItem(STORAGE_KEY, id)
      else localStorage.removeItem(STORAGE_KEY)
    } catch {
      /* ignore */
    }
  }, [])

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    const localList = localStudentProfiles()
    try {
      const serverList = asArray<ServerStudent>(await api.listStudents())
      const list = await syncLocalStudentsToServer(serverList, asArray(localList))
      setStudents(list)
      if (!activeStudentId && list[0]) setActiveStudentId(list[0].id)
      else if (activeStudentId && !list.find((s) => s.id === activeStudentId) && list[0]) {
        setActiveStudentId(list[0].id)
      }
    } catch (e) {
      setStudents(localList)
      if (!activeStudentId && localList[0]) setActiveStudentId(localList[0].id)
      else if (activeStudentId && !localList.find((s) => s.id === activeStudentId) && localList[0]) {
        setActiveStudentId(localList[0].id)
      }
      if (localList.length === 0) setError(e instanceof Error ? e.message : 'Ошибка загрузки')
    } finally {
      setLoading(false)
    }
  }, [activeStudentId, setActiveStudentId])

  useEffect(() => {
    void reload()
    const unsubscribe = subscribeAuth(() => void reload())
    window.addEventListener('storage', reload)
    window.addEventListener('focus', reload)
    return () => {
      unsubscribe()
      window.removeEventListener('storage', reload)
      window.removeEventListener('focus', reload)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const upsertLocal = useCallback((s: ServerStudent) => {
    setStudents((prev) => {
      const idx = prev.findIndex((x) => x.id === s.id)
      if (idx === -1) return [...prev, s]
      const copy = [...prev]
      copy[idx] = s
      return copy
    })
  }, [])

  const removeLocal = useCallback(
    (id: string) => {
      setStudents((prev) => prev.filter((x) => x.id !== id))
      if (activeStudentId === id) setActiveStudentId(null)
    },
    [activeStudentId, setActiveStudentId],
  )

  const value = useMemo<Ctx>(
    () => ({
      students,
      loading,
      error,
      activeStudentId,
      activeStudent: students.find((s) => s.id === activeStudentId) ?? null,
      setActiveStudentId,
      reload,
      upsertLocal,
      removeLocal,
    }),
    [students, loading, error, activeStudentId, setActiveStudentId, reload, upsertLocal, removeLocal],
  )

  return <StudentContext.Provider value={value}>{children}</StudentContext.Provider>
}

export function useStudents() {
  const ctx = useContext(StudentContext)
  if (!ctx) throw new Error('useStudents must be used within StudentProvider')
  return ctx
}
