import type { IncomingMessage, ServerResponse } from 'http'
import { COACH_UNAVAILABLE, userFacingAiError } from '@/lib/learning/ai-error-hint'
import { groqChat, isGroqConfigured, type GroqMessage } from '@/lib/learning/groq-chat'
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

const SYSTEM_PROMPT = `Ты — ИИ-ассистент для учителя на платформе **ten**.
Учитель выбирает одного ученика и спрашивает о его прогрессе, слабых местах и следующих шагах.
Ты опираешься ТОЛЬКО на профиль ученика, его результаты, прогресс и заметки, которые передаются ниже.
Обращайся к пользователю как к учителю (на «вы»), говорите О ученике в третьем лице. Не путайте учителя с учеником.
Если данных нет — честно скажите об этом и предложите добавить заметку.

Стиль:
- отвечайте на языке сообщения учителя (kk/ru/en);
- коротко, по делу, дружелюбно, без воды;
- при оценке профессии давайте: зарплату (KZT), спрос (low/medium/high), путь, риски;
- при разговоре о деньгах учитывайте financial_route и подсвечивайте grants с дедлайнами;
- предлагайте один конкретный следующий шаг для ученика.

Если учитель просит "запомнить" или "добавь заметку" — выдайте команду
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

      const hasKey = isGroqConfigured()
      let answer = ''
      let source: 'ai' | 'fallback' = 'fallback'
      let aiError: string | undefined

      if (hasKey) {
        try {
          const messages = buildGroqMessages({
            student: {
              displayName: student.displayName,
              language: student.language,
              primary: student.primaryCareerTitle,
            },
            vault,
            history: [...conv.messages, userMsg].slice(-12),
          })
          const result = await groqChat(messages, { maxTokens: 800, temperature: 0.4 })
          answer = result.content?.trim() ?? ''
          aiError = result.error
          if (answer) source = 'ai'
        } catch (err) {
          aiError = err instanceof Error ? err.message : 'AI request failed.'
          console.warn('[agent] ai error:', err)
        }
      }

      if (!answer) {
        answer = hasKey
          ? userFacingAiError(aiError, COACH_UNAVAILABLE)
          : buildFallback(student.displayName, body.message)
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

function buildGroqMessages(args: {
  student: { displayName: string; language: string; primary: string }
  vault: { profile: string; notes: { fileName: string; title: string; content: string }[] } | null
  history: ChatMessage[]
}): GroqMessage[] {
  const { student, vault, history } = args
  const profile = vault?.profile ?? '_профиль ещё не заполнен_'
  const notesBlock = vault?.notes.length
    ? vault.notes
        .map((n) => `### Заметка: ${n.title} (\`${n.fileName}\`)\n${n.content}`)
        .join('\n\n---\n\n')
    : '_заметок пока нет_'

  const systemContent = [
    SYSTEM_PROMPT,
    '',
    `Выбранный ученик: ${student.displayName} (язык интерфейса: ${student.language}, основное направление: ${student.primary || '—'})`,
    '',
    '## Профиль ученика',
    profile,
    '',
    '## Заметки и результаты',
    notesBlock,
  ].join('\n')

  return [
    { role: 'system', content: systemContent },
    ...history.map((message) => ({
      role: message.role,
      content: message.text,
    })),
  ]
}

function buildFallback(studentName: string, message: string): string {
  return [
    'AI-наставник сейчас недоступен: на сервере не настроен GROQ_API_KEY.',
    `Ваш вопрос по ученику «${studentName}»: «${message}».`,
    'После подключения ключа отвечу с учётом профиля, результатов и ваших заметок.',
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
