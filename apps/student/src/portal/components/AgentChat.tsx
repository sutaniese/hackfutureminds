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
    if (!activeStudentId || !activeStudent) {
      setMessages([])
      return
    }
    let cancelled = false
    void (async () => {
      try {
        await api.upsertStudent(activeStudent)
        const conv = await api.chatHistory(activeStudentId)
        if (!cancelled) setMessages(conv.messages)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Ошибка истории')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [activeStudentId, activeStudent])

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  async function handleSend(e: FormEvent) {
    e.preventDefault()
    if (!activeStudentId || !activeStudent || !input.trim() || busy) return
    const text = input.trim()
    setInput('')
    setError(null)
    const userMsg: ChatMessage = { role: 'user', text, ts: new Date().toISOString() }
    setMessages((prev) => [...prev, userMsg])
    setBusy(true)
    try {
      await api.upsertStudent(activeStudent)
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
    <section className="pw-card flex min-h-[70dvh] flex-col p-5 md:p-6" aria-labelledby="agent-title">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-pathwise-line pb-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-pathwise-accent-strong">AI-наставник</p>
          <h2 id="agent-title" className="mt-1 text-2xl font-bold text-pathwise-ink">
            Чат с AI-наставником
          </h2>
          <p className="text-xs text-pathwise-muted">
            Агент помнит профиль ученика, результаты диагностики и заметки по прогрессу.
            Учитель может спросить, где пробелы и что делать дальше.
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
            className="pw-input px-3 py-2 text-sm"
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
            className="min-h-[40px] rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-pathwise-muted hover:bg-white hover:text-slate-900 disabled:opacity-50"
          >
            Очистить чат
          </button>
        </div>
      </header>

      {!activeStudent && (
        <p className="mt-4 text-sm text-pathwise-muted">Выберите ученика — наставник подгрузит его профиль и результаты.</p>
      )}

      {activeStudent && (
        <>
          <div
            ref={listRef}
            className="mt-4 flex min-h-[440px] flex-1 flex-col gap-3 overflow-y-auto rounded-[1.6rem] border border-slate-200 bg-slate-50 p-4"
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
              <div className="self-start rounded-2xl bg-white px-4 py-2 text-sm text-pathwise-muted ring-1 ring-pathwise-line">
                <span className="pw-shimmer rounded-full px-2">агент думает…</span>
              </div>
            )}
          </div>

          <form onSubmit={handleSend} className="mt-3 flex flex-wrap gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Спросите: «расскажи про мой план», «сохрани заметку: …»"
              className="pw-input min-h-[48px] flex-1 px-4 py-2 text-sm"
              disabled={busy}
              aria-label="Сообщение агенту"
            />
            <button
              type="submit"
              disabled={busy || !input.trim()}
              className="pw-primary-btn pw-focus px-5 py-2 text-sm disabled:opacity-50"
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
      className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
        mine
          ? 'self-end rounded-br-md bg-[#6C63FF] text-white shadow-sm'
          : 'self-start rounded-bl-md bg-white text-pathwise-ink ring-1 ring-pathwise-line '
      }`}
    >
      {msg.text}
    </div>
  )
}
