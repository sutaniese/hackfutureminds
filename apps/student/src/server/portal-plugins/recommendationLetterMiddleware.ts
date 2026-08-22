import type { IncomingMessage, ServerResponse } from 'http'
import { getGeminiApiKey, geminiGenerate } from './geminiClient'

export type RecommendationLetterRequest = {
  language: 'kk' | 'ru' | 'en'
  /** Полный JSON-профиль ученика из «базы» (как в ten) */
  student: Record<string, unknown>
}

export type RecommendationLetterResponse = {
  letter: string
  source: 'gemini' | 'fallback'
}

function fallbackLetter(lang: 'kk' | 'ru' | 'en', student: Record<string, unknown>): string {
  const name = String(student.displayName ?? 'Ученик')
  const ach = Array.isArray(student.achievements) ? (student.achievements as string[]).join('; ') : ''
  const career = String(student.primaryCareerTitle ?? '')
  if (lang === 'kk') {
    return `[Резерв] Мен ${name} оқушыны ұсынамын. Жетістіктер: ${ach}. Мамандық бағыты: ${career}. Gemini API кілті жоқ немесе қате — нақты мәтінді алу үшін .env файлында GEMINI_API_KEY көрсетіңіз.`
  }
  if (lang === 'en') {
    return `[Fallback] I recommend ${name}. Achievements: ${ach}. Career focus: ${career}. Set GEMINI_API_KEY in .env for a full AI-generated letter via Gemini.`
  }
  return `[Резерв] Рекомендую ученика ${name}. Достижения: ${ach}. Карьерный фокус: ${career}. Для полноценного письма укажите GEMINI_API_KEY в .env и перезапустите dev-сервер.`
}

async function callGeminiLetter(lang: 'kk' | 'ru' | 'en', student: Record<string, unknown>): Promise<string | null> {
  if (!getGeminiApiKey()) return null

  const langName =
    lang === 'kk' ? 'казахском' : lang === 'en' ? 'English' : 'русском'

  const userPrompt = `Ты — классный руководитель / учитель в школе Казахстана. Напиши официальное рекомендательное письмо для поступления (вуз или программа), строго на ${langName} языке.

Данные ученика (JSON):
${JSON.stringify(student, null, 2)}

Требования:
- Тон: уважительный, конкретный, без штампов «лучший ученик школы» без доказательств.
- Опирайся на достижения, интересы, выбранное направление и целевой вуз из данных.
- Структура: вступление → академические/проектные сильные стороны → личные качества (по фактам из профиля) → заключение с рекомендацией.
- Объём: 250–400 слов (или эквивалент для казахского/английского).
- Не включай JSON в ответ — только текст письма с датой и подписью «Классный руководитель» в конце.`

  const text = await geminiGenerate(userPrompt)
  return text || null
}

export async function recommendationLetterMiddleware(
  req: IncomingMessage,
  res: ServerResponse,
  readBodyFn: (req: IncomingMessage) => Promise<string>,
): Promise<void> {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') {
    res.statusCode = 204
    res.end()
    return
  }

  try {
    const raw = await readBodyFn(req)
    const body = JSON.parse(raw) as RecommendationLetterRequest
    if (!body.student || typeof body.student !== 'object') {
      res.statusCode = 400
      res.setHeader('Content-Type', 'application/json; charset=utf-8')
      res.end(JSON.stringify({ error: 'Поле student обязательно (JSON-профиль)' }))
      return
    }
    const lang = body.language === 'kk' || body.language === 'en' ? body.language : 'ru'

    let letter: string
    let source: 'gemini' | 'fallback' = 'gemini'
    try {
      const fromAi = await callGeminiLetter(lang, body.student)
      letter = fromAi ?? fallbackLetter(lang, body.student)
      if (!fromAi) source = 'fallback'
    } catch {
      letter = fallbackLetter(lang, body.student)
      source = 'fallback'
    }

    res.statusCode = 200
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.end(JSON.stringify({ letter, source } satisfies RecommendationLetterResponse))
  } catch (e) {
    res.statusCode = 500
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.end(JSON.stringify({ error: String(e) }))
  }
}
