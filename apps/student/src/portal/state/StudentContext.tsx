import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { api, type ServerStudent } from '../lib/api'

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
    try {
      const list = await api.listStudents()
      setStudents(list)
      if (!activeStudentId && list[0]) setActiveStudentId(list[0].id)
      else if (activeStudentId && !list.find((s) => s.id === activeStudentId) && list[0]) {
        setActiveStudentId(list[0].id)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка загрузки')
    } finally {
      setLoading(false)
    }
  }, [activeStudentId, setActiveStudentId])

  useEffect(() => {
    void reload()
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
