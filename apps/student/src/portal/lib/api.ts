import type { StudentProfile } from '../types/pathwise'

export type Lang = 'kk' | 'ru' | 'en'

export type ServerStudent = StudentProfile & {
  classId?: string | null
  onboardingComplete: boolean
  needsFinancialHelp?: boolean
  createdAt?: string
  updatedAt?: string
}

export type ServerClass = {
  id: string
  name: string
  inviteCode: string
  studentIds: string[]
  createdAt: string
}

export type StudentNote = {
  fileName: string
  title: string
  content: string
  updatedAt?: string
}

export type ChatMessage = { role: 'user' | 'assistant'; text: string; ts: string }
export type Conversation = { id: string; studentId: string; messages: ChatMessage[] }

async function jsonFetch<T>(input: string, init?: RequestInit): Promise<T> {
  const res = await fetch(input, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  })
  const text = await res.text()
  let body: unknown = null
  try {
    body = text ? JSON.parse(text) : null
  } catch {
    body = { raw: text }
  }
  if (!res.ok) {
    const msg = (body as { error?: string })?.error ?? `HTTP ${res.status}`
    throw new Error(msg)
  }
  return body as T
}

export const api = {
  listStudents: () => jsonFetch<{ students: ServerStudent[] }>('/api/students').then((r) => r.students),
  getStudent: (id: string) => jsonFetch<{ student: ServerStudent }>(`/api/students/${encodeURIComponent(id)}`).then((r) => r.student),
  upsertStudent: (s: Partial<ServerStudent>) =>
    jsonFetch<{ student: ServerStudent }>('/api/students', { method: 'POST', body: JSON.stringify(s) }).then((r) => r.student),
  updateStudent: (id: string, patch: Partial<ServerStudent>) =>
    jsonFetch<{ student: ServerStudent }>(`/api/students/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(patch),
    }).then((r) => r.student),
  deleteStudent: (id: string) =>
    jsonFetch<{ ok: boolean }>(`/api/students/${encodeURIComponent(id)}`, { method: 'DELETE' }),

  listClasses: () => jsonFetch<{ classes: ServerClass[] }>('/api/classes').then((r) => r.classes),
  createClass: (name: string) =>
    jsonFetch<{ class: ServerClass }>('/api/classes', { method: 'POST', body: JSON.stringify({ name }) }).then((r) => r.class),
  joinClass: (inviteCode: string, studentId?: string) =>
    jsonFetch<{ class: ServerClass; student?: ServerStudent }>('/api/classes/join', {
      method: 'POST',
      body: JSON.stringify(studentId ? { inviteCode, studentId } : { inviteCode }),
    }),
  deleteClass: (id: string) =>
    jsonFetch<{ ok: boolean }>(`/api/classes/${encodeURIComponent(id)}`, { method: 'DELETE' }),

  listNotes: (studentId: string) =>
    jsonFetch<{ notes: StudentNote[] }>(`/api/students/${encodeURIComponent(studentId)}/notes`).then((r) => r.notes),
  saveNote: (studentId: string, note: { title: string; content: string; fileName?: string }) =>
    jsonFetch<{ note: StudentNote }>(`/api/students/${encodeURIComponent(studentId)}/notes`, {
      method: 'POST',
      body: JSON.stringify(note),
    }).then((r) => r.note),
  deleteNote: (studentId: string, fileName: string) =>
    jsonFetch<{ ok: boolean }>(
      `/api/students/${encodeURIComponent(studentId)}/notes/${encodeURIComponent(fileName)}`,
      { method: 'DELETE' },
    ),

  chatHistory: (studentId: string) =>
    jsonFetch<{ conversation: Conversation }>(
      `/api/agent/history?studentId=${encodeURIComponent(studentId)}`,
    ).then((r) => r.conversation),
  chat: (studentId: string, message: string, classId?: string) =>
    jsonFetch<{
      reply: string
      source: 'ai' | 'fallback'
      savedNote?: { fileName: string }
      published?: { id: string; title: string } | null
    }>('/api/agent/chat', {
      method: 'POST',
      body: JSON.stringify({ studentId, classId, message }),
    }),
  clearChat: (studentId: string) =>
    jsonFetch<{ ok: boolean }>('/api/agent/clear', { method: 'POST', body: JSON.stringify({ studentId }) }),
}
