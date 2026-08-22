import type { IncomingMessage, ServerResponse } from 'http'
import { getQuery, parseJson, pathOf, sendJson } from './httpUtils'
import {
  createClass,
  deleteClass,
  deleteStudent,
  deleteStudentNote,
  findClassByInvite,
  getClass,
  getStudent,
  listClasses,
  listStudentNotes,
  listStudents,
  readStudentNote,
  saveStudentNote,
  type StudentProfile,
  upsertStudent,
} from './vaultStore'

type ReadBody = (req: IncomingMessage) => Promise<string>

/**
 * REST API поверх локального vault (dev).
 *
 *  GET    /api/students                       → list
 *  GET    /api/students/:id                   → get
 *  POST   /api/students                       → upsert (id опционально)
 *  PUT    /api/students/:id                   → upsert (id из URL)
 *  DELETE /api/students/:id                   → удалить
 *
 *  GET    /api/students/:id/notes             → список заметок
 *  GET    /api/students/:id/notes/:fileName   → прочитать заметку
 *  POST   /api/students/:id/notes             → создать/обновить заметку {title, content, fileName?}
 *  DELETE /api/students/:id/notes/:fileName   → удалить заметку
 *
 *  GET    /api/classes                        → list
 *  POST   /api/classes                        → создать {name}
 *  GET    /api/classes/:id                    → get
 *  DELETE /api/classes/:id                    → удалить
 *
 *  POST   /api/classes/join                   → присоединить ученика к классу {inviteCode, studentId}
 */
export async function studentsApiMiddleware(
  req: IncomingMessage,
  res: ServerResponse,
  readBody: ReadBody,
): Promise<boolean> {
  const path = pathOf(req)
  const method = (req.method ?? 'GET').toUpperCase()
  if (!path.startsWith('/api/')) return false

  try {
    if (path === '/api/students' && method === 'GET') {
      sendJson(res, 200, { students: listStudents() })
      return true
    }
    if (path === '/api/students' && method === 'POST') {
      const body = parseJson<Partial<StudentProfile>>(await readBody(req))
      if (!body) return badRequest(res, 'Invalid JSON')
      const saved = upsertStudent(body)
      sendJson(res, 200, { student: saved })
      return true
    }

    const studentMatch = path.match(/^\/api\/students\/([^/]+)$/)
    if (studentMatch) {
      const id = decodeURIComponent(studentMatch[1])
      if (method === 'GET') {
        const s = getStudent(id)
        if (!s) return notFound(res)
        sendJson(res, 200, { student: s })
        return true
      }
      if (method === 'PUT' || method === 'PATCH') {
        const body = parseJson<Partial<StudentProfile>>(await readBody(req))
        if (!body) return badRequest(res, 'Invalid JSON')
        const saved = upsertStudent({ ...body, id })
        sendJson(res, 200, { student: saved })
        return true
      }
      if (method === 'DELETE') {
        const ok = deleteStudent(id)
        sendJson(res, ok ? 200 : 404, { ok })
        return true
      }
    }

    const notesListMatch = path.match(/^\/api\/students\/([^/]+)\/notes$/)
    if (notesListMatch) {
      const id = decodeURIComponent(notesListMatch[1])
      if (method === 'GET') {
        sendJson(res, 200, { notes: listStudentNotes(id) })
        return true
      }
      if (method === 'POST') {
        const body = parseJson<{ title?: string; content?: string; fileName?: string }>(await readBody(req))
        if (!body || typeof body.content !== 'string') return badRequest(res, 'Required: content')
        const note = saveStudentNote(id, body.title ?? '', body.content, body.fileName)
        sendJson(res, 200, { note })
        return true
      }
    }

    const noteFileMatch = path.match(/^\/api\/students\/([^/]+)\/notes\/(.+)$/)
    if (noteFileMatch) {
      const id = decodeURIComponent(noteFileMatch[1])
      const fileName = decodeURIComponent(noteFileMatch[2])
      if (method === 'GET') {
        const content = readStudentNote(id, fileName)
        if (content === null) return notFound(res)
        sendJson(res, 200, { fileName, content })
        return true
      }
      if (method === 'DELETE') {
        const ok = deleteStudentNote(id, fileName)
        sendJson(res, ok ? 200 : 404, { ok })
        return true
      }
    }

    if (path === '/api/classes' && method === 'GET') {
      sendJson(res, 200, { classes: listClasses() })
      return true
    }
    if (path === '/api/classes' && method === 'POST') {
      const body = parseJson<{ name?: string }>(await readBody(req))
      if (!body?.name) return badRequest(res, 'Required: name')
      const cls = createClass(body.name)
      sendJson(res, 200, { class: cls })
      return true
    }
    if (path === '/api/classes/join' && method === 'POST') {
      const body = parseJson<{ inviteCode?: string; studentId?: string }>(await readBody(req))
      if (!body?.inviteCode || !body.studentId) return badRequest(res, 'Required: inviteCode, studentId')
      const cls = findClassByInvite(body.inviteCode)
      if (!cls) return notFound(res, 'Класс не найден по коду')
      const s = getStudent(body.studentId)
      if (!s) return notFound(res, 'Ученик не найден')
      const updated = upsertStudent({ id: s.id, classId: cls.id })
      sendJson(res, 200, { class: cls, student: updated })
      return true
    }

    const classMatch = path.match(/^\/api\/classes\/([^/]+)$/)
    if (classMatch) {
      const id = decodeURIComponent(classMatch[1])
      if (method === 'GET') {
        const c = getClass(id)
        if (!c) return notFound(res)
        sendJson(res, 200, { class: c })
        return true
      }
      if (method === 'DELETE') {
        const ok = deleteClass(id)
        sendJson(res, ok ? 200 : 404, { ok })
        return true
      }
    }

    if (path === '/api/health' && method === 'GET') {
      sendJson(res, 200, { ok: true, ts: new Date().toISOString() })
      return true
    }

    // Игнорируем query-параметры
    if (getQuery(req)) {
      // do nothing
    }

    return false
  } catch (err) {
    sendJson(res, 500, { error: err instanceof Error ? err.message : 'Internal error' })
    return true
  }
}

function badRequest(res: ServerResponse, msg: string) {
  sendJson(res, 400, { error: msg })
  return true
}

function notFound(res: ServerResponse, msg = 'Not found') {
  sendJson(res, 404, { error: msg })
  return true
}
