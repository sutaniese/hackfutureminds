import { FormEvent, useEffect, useRef, useState } from 'react'
import { api, type ChatMessage } from '../lib/api'
import { useStudents } from '../state/StudentContext'

export function AgentChat() {
  const { activeStudent, students, activeStudentId, setActiveStudentId } = useStudents()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [source, setSource] = useState<'gemini' | 'fallback' | null>(null)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!activeStudentId) {
      setMessages([])
      return
    }
    let cancelled = false
    void (async () => {
      try {
        const conv = await api.chatHistory(activeStudentId)
        if (!cancelled) setMessages(conv.messages)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Ошибка истории')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [activeStudentId])

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  async function handleSend(e: FormEvent) {
    e.preventDefault()
    if (!activeStudentId || !input.trim() || busy) return
    const text = input.trim()
    setInput('')
    setError(null)
    const userMsg: ChatMessage = { role: 'user', text, ts: new Date().toISOString() }
    setMessages((prev) => [...prev, userMsg])
    setBusy(true)
    try {
      const r = await api.chat(activeStudentId, text)
      setSource(r.source)
      const reply: ChatMessage = { role: 'assistant', text: r.reply, ts: new Date().toISOString() }
      setMessages((prev) => [...prev, reply])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка запроса')
    } finally {
      setBusy(false)
    }
  }

  async function handleClear() {
    if (!activeStudentId) return
    await api.clearChat(activeStudentId)
    setMessages([])
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm" aria-labelledby="agent-title">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-pathwise-accent">AI-наставник</p>
          <h2 id="agent-title" className="mt-1 text-lg font-semibold text-pathwise-ink">
            Чат с агентом по Obsidian-vault
          </h2>
          <p className="text-xs text-pathwise-muted">
            Память агента — папка <code className="rounded bg-slate-100 px-1">ten-vault/students/&lt;id&gt;</code>.
            Файлы можно открыть в Obsidian.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <label htmlFor="agent-student" className="sr-only">
            Ученик
          </label>
          <select
            id="agent-student"
            value={activeStudentId ?? ''}
            onChange={(e) => setActiveStudentId(e.target.value || null)}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-pathwise-accent"
          >
            <option value="">— ученик не выбран —</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.displayName}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleClear}
            disabled={!activeStudentId || messages.length === 0}
            className="min-h-[40px] rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-pathwise-muted hover:bg-slate-50 disabled:opacity-50"
          >
            Очистить чат
          </button>
        </div>
      </header>

      {!activeStudent && (
        <p className="mt-4 text-sm text-pathwise-muted">Выберите ученика — память грузится из его vault-файла.</p>
      )}

      {activeStudent && (
        <>
          <div
            ref={listRef}
            className="mt-4 flex h-[420px] flex-col gap-3 overflow-y-auto rounded-xl bg-pathwise-surface/60 p-4"
            role="log"
            aria-live="polite"
          >
            {messages.length === 0 && (
              <p className="m-auto text-center text-sm text-pathwise-muted">
                Поздоровайтесь с агентом. Он уже знает профиль ученика «{activeStudent.displayName}».
              </p>
            )}
            {messages.map((m, i) => (
              <Bubble key={i} msg={m} />
            ))}
            {busy && (
              <div className="self-start rounded-2xl bg-white px-4 py-2 text-sm text-pathwise-muted ring-1 ring-slate-200">
                агент думает…
              </div>
            )}
          </div>

          <form onSubmit={handleSend} className="mt-3 flex flex-wrap gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Спросите: «расскажи про мой план», «сохрани заметку: …»"
              className="min-h-[44px] flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-pathwise-accent"
              disabled={busy}
              aria-label="Сообщение агенту"
            />
            <button
              type="submit"
              disabled={busy || !input.trim()}
              className="min-h-[44px] rounded-xl bg-pathwise-accent px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              Отправить
            </button>
          </form>

          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-pathwise-muted">
            {source && (
              <span>
                Источник:{' '}
                <strong className={source === 'gemini' ? 'text-emerald-600' : 'text-amber-600'}>
                  {source === 'gemini' ? 'Gemini' : 'fallback'}
                </strong>
              </span>
            )}
            {error && <span className="text-rose-600">{error}</span>}
          </div>
        </>
      )}
    </section>
  )
}

function Bubble({ msg }: { msg: ChatMessage }) {
  const mine = msg.role === 'user'
  return (
    <div
      className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-4 py-2 text-sm leading-relaxed shadow-sm ${
        mine
          ? 'self-end bg-pathwise-accent text-white'
          : 'self-start bg-white text-pathwise-ink ring-1 ring-slate-200'
      }`}
    >
      {msg.text}
    </div>
  )
}
