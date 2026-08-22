/**
 * Google Gemini (Generative Language API). Ключ: GEMINI_API_KEY или GOOGLE_API_KEY в .env (не коммитить).
 * Модель: GEMINI_MODEL (по умолчанию gemini-2.0-flash).
 */
export function getGeminiApiKey(): string | undefined {
  return process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY
}

const DEFAULT_MODEL = 'gemini-2.0-flash'

function extractText(data: unknown): string {
  const d = data as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
    error?: { message?: string }
  }
  if (d.error?.message) throw new Error(d.error.message)
  const parts = d.candidates?.[0]?.content?.parts
  return (parts?.map((p) => p.text).filter(Boolean).join('') ?? '').trim()
}

export async function geminiGenerate(
  prompt: string,
  opts?: { responseMimeType?: 'application/json' | 'text/plain' },
): Promise<string> {
  const key = getGeminiApiKey()
  if (!key) throw new Error('Missing GEMINI_API_KEY')

  const model = process.env.GEMINI_MODEL?.trim() || DEFAULT_MODEL
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`

  const payload: Record<string, unknown> = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
  }
  if (opts?.responseMimeType) {
    payload.generationConfig = { responseMimeType: opts.responseMimeType }
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  const raw = await res.text()
  if (!res.ok) {
    throw new Error(`Gemini HTTP ${res.status}: ${raw.slice(0, 600)}`)
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new Error('Gemini: невалидный JSON ответа')
  }

  return extractText(parsed)
}
