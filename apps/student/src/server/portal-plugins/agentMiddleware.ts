import type { IncomingMessage, ServerResponse } from 'http'
import { geminiGenerate, getGeminiApiKey } from './geminiClient'
import { parseJson, pathOf, sendJson } from './httpUtils'
import {
  appendChatMessage,
  clearConversation,
  getConversation,
  getStudent,
  getStudentVaultMarkdown,
  saveStudentNote,
  type ChatMessage,
} from './vaultStore'

type ReadBody = (req: IncomingMessage) => Promise<string>

const SYSTEM_PROMPT = `Ты — персональный ИИ-наставник по платформе **ten** для одного конкретного ученика.
Ты опираешься ТОЛЬКО на профиль ученика, его результаты, прогресс и заметки наставника, которые передаются ниже.
Учитель может спрашивать о прогрессе, слабых местах и следующих шагах — отвечай по этим данным.
Если данных нет — честно скажи об этом и предложи добавить заметку.

Стиль:
- говори на языке ученика (kk/ru/en) исходя из его профиля; если он пишет тебе на другом — отвечай на языке его сообщения;
- коротко, по делу, дружелюбно, без воды;
- при оценке профессии давай: зарплату (KZT), спрос (low/medium/high), путь, риски;
- при разговоре о деньгах учитывай financial_route и подсвечивай grants с дедлайнами;
- предлагай конкретный следующий шаг (1 действие).

Если пользователь просит "запомнить" или "добавь заметку" — выдай команду
вида \`<<SAVE_NOTE title="..." filename="..." >>\\n...content...\\n<<END_NOTE>>\` (фронт это распознает).
`

export async function agentMiddleware(
  req: IncomingMessage,
  res: ServerResponse,
  readBody: ReadBody,
): Promise<boolean> {
  const path = pathOf(req)
  const method = (req.method ?? 'GET').toUpperCase()
  if (!path.startsWith('/api/agent')) return false

  try {
    if (path === '/api/agent/history' && method === 'GET') {
      const url = new URL(req.url ?? '/', 'http://localhost')
      const studentId = url.searchParams.get('studentId') ?? ''
      if (!studentId) return badRequest(res, 'Required: studentId')
      sendJson(res, 200, { conversation: getConversation(studentId) })
      return true
    }
    if (path === '/api/agent/clear' && method === 'POST') {
      const body = parseJson<{ studentId?: string }>(await readBody(req))
      if (!body?.studentId) return badRequest(res, 'Required: studentId')
      clearConversation(body.studentId)
      sendJson(res, 200, { ok: true })
      return true
    }
    if (path === '/api/agent/chat' && method === 'POST') {
      const body = parseJson<{ studentId?: string; message?: string }>(await readBody(req))
      if (!body?.studentId || !body.message?.trim()) {
        return badRequest(res, 'Required: studentId, message')
      }

      const student = getStudent(body.studentId)
      if (!student) return notFound(res, 'Ученик не найден')

      const vault = getStudentVaultMarkdown(student.id)
      const conv = getConversation(student.id)

      const userMsg: ChatMessage = { role: 'user', text: body.message.trim(), ts: new Date().toISOString() }
      appendChatMessage(student.id, userMsg)

      const hasKey = !!getGeminiApiKey()
      let answer = ''
      let source: 'gemini' | 'fallback' = 'fallback'

      if (hasKey) {
        try {
          const prompt = buildPrompt({
            student: {
              displayName: student.displayName,
              language: student.language,
              primary: student.primaryCareerTitle,
            },
            vault,
            history: [...conv.messages, userMsg].slice(-12),
          })
          answer = (await geminiGenerate(prompt)).trim()
          if (answer) source = 'gemini'
        } catch (err) {
          console.warn('[agent] gemini error:', err)
        }
      }

      if (!answer) {
        answer = buildFallback(student.displayName, body.message)
      }

      const noteParsed = extractAutoNote(answer)
      let savedNote: { fileName: string } | undefined
      if (noteParsed) {
        const note = saveStudentNote(student.id, noteParsed.title, noteParsed.content, noteParsed.fileName)
        savedNote = { fileName: note.fileName }
        answer = noteParsed.cleaned + (noteParsed.cleaned ? '\n\n' : '') + `🗒 Сохранено в \`${note.fileName}\``
      }

      const assistantMsg: ChatMessage = { role: 'assistant', text: answer, ts: new Date().toISOString() }
      appendChatMessage(student.id, assistantMsg)

      sendJson(res, 200, { reply: answer, source, savedNote })
      return true
    }

    return false
  } catch (err) {
    sendJson(res, 500, { error: err instanceof Error ? err.message : 'Internal error' })
    return true
  }
}

function buildPrompt(args: {
  student: { displayName: string; language: string; primary: string }
  vault: { profile: string; notes: { fileName: string; title: string; content: string }[] } | null
  history: ChatMessage[]
}): string {
  const { student, vault, history } = args
  const profile = vault?.profile ?? '_профиль ещё не заполнен_'
  const notesBlock = vault?.notes.length
    ? vault.notes
        .map((n) => `### Заметка: ${n.title} (\`${n.fileName}\`)\n${n.content}`)
        .join('\n\n---\n\n')
    : '_заметок пока нет_'

  const historyBlock = history
    .map((m) => `${m.role === 'user' ? 'Ученик' : 'Ассистент'}: ${m.text}`)
    .join('\n')

  return [
    SYSTEM_PROMPT,
    '',
    `Ученик: ${student.displayName} (язык интерфейса: ${student.language}, основное направление: ${student.primary || '—'})`,
    '',
    '## Профиль ученика',
    profile,
    '',
    '## Заметки и результаты',
    notesBlock,
    '',
    '## История диалога',
    historyBlock,
    '',
    'Ответь следующим сообщением ученику.',
  ].join('\n')
}

function buildFallback(name: string, message: string): string {
  return [
    `Привет, ${name}! Я твой AI-наставник в ten (offline-режим — нет ключа Gemini в .env).`,
    `Я записал твой вопрос: "${message}".`,
    'Когда подключим API — отвечу с учётом профиля, результатов и заметок ученика.',
  ].join('\n')
}

/**
 * Парсим спец-блок:
 *   <<SAVE_NOTE title="..." filename="...">>
 *   ...тело заметки...
 *   <<END_NOTE>>
 */
function extractAutoNote(
  text: string,
): { title: string; fileName?: string; content: string; cleaned: string } | null {
  const m = text.match(/<<SAVE_NOTE([^>]*)>>([\s\S]*?)<<END_NOTE>>/)
  if (!m) return null
  const attrs = m[1] ?? ''
  const titleMatch = attrs.match(/title\s*=\s*"([^"]+)"/i)
  const fileMatch = attrs.match(/filename\s*=\s*"([^"]+)"/i)
  const content = (m[2] ?? '').trim()
  const cleaned = text.replace(m[0], '').trim()
  return {
    title: titleMatch?.[1] ?? 'Заметка',
    fileName: fileMatch?.[1],
    content,
    cleaned,
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
