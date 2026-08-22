import type { IncomingMessage, ServerResponse } from 'http'
import { getGeminiApiKey, geminiGenerate } from './geminiClient'

export type CareerCompareRequestBody = {
  parentProfession: string
  childProfession: string
  region?: string
}

export type CareerCompareResponse = {
  parentMarket: {
    salaryRangeKzt: string
    demand: string
    outlook5y: string
  }
  childMarket: {
    salaryRangeKzt: string
    demand: string
    outlook5y: string
  }
  summary: string
  source: 'gemini' | 'fallback'
}

const FALLBACK: CareerCompareResponse = {
  parentMarket: {
    salaryRangeKzt: '200 000 – 400 000 ₸/мес (оценка, офлайн)',
    demand: 'Средний/высокий (зависит от региона)',
    outlook5y: 'Стабильный спрос в гос. и частном секторе',
  },
  childMarket: {
    salaryRangeKzt: '250 000 – 600 000 ₸/мес (оценка, офлайн)',
    demand: 'Растущий в digital/STEM',
    outlook5y: 'Выше среднего при наличии портфолио',
  },
  summary:
    'Нет ответа от Gemini. Укажите GEMINI_API_KEY в .env и перезапустите dev-сервер.',
  source: 'fallback',
}

async function callGemini(body: CareerCompareRequestBody): Promise<CareerCompareResponse | null> {
  if (!getGeminiApiKey()) return null

  const userPrompt = `Регион по умолчанию: Казахстан (${body.region ?? 'Казахстан'}).

Профессия, которую родитель считает подходящей для ребёнка: "${body.parentProfession}".
Профессия/направление, которое выбрал ребёнок в ten: "${body.childProfession}".

Верни СТРОГО JSON (без markdown, без пояснений до или после JSON) по схеме:
{
  "parentMarket": { "salaryRangeKzt": "строка в тенге/мес диапазон",
    "demand": "кратко спрос на рынке KZ",
    "outlook5y": "перспектива через 5 лет" },
  "childMarket": { "salaryRangeKzt": "...", "demand": "...", "outlook5y": "..." },
  "summary": "2-3 предложения нейтрально для семьи: сравнение без морализаторства"
}
Используй реалистичные ориентиры по рынку труда KZ; если данных мало — честно укажи неопределённость в полях.`

  const text = await geminiGenerate(userPrompt, { responseMimeType: 'application/json' })
  const parsed = JSON.parse(text) as Omit<CareerCompareResponse, 'source'>
  return {
    ...parsed,
    source: 'gemini',
  }
}

export async function careerCompareMiddleware(
  req: IncomingMessage,
  res: ServerResponse,
  readBody: (req: IncomingMessage) => Promise<string>,
): Promise<void> {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') {
    res.statusCode = 204
    res.end()
    return
  }

  try {
    const raw = await readBody(req)
    const body = JSON.parse(raw) as CareerCompareRequestBody
    if (!body.parentProfession?.trim() || !body.childProfession?.trim()) {
      res.statusCode = 400
      res.setHeader('Content-Type', 'application/json; charset=utf-8')
      res.end(JSON.stringify({ error: 'parentProfession и childProfession обязательны' }))
      return
    }

    let out: CareerCompareResponse
    try {
      const ai = await callGemini(body)
      out = ai ?? { ...FALLBACK, summary: FALLBACK.summary + ' (нет ключа API)' }
    } catch {
      out = {
        ...FALLBACK,
        summary:
          'Временная ошибка Gemini. Показаны ориентиры-заглушки; повторите запрос позже.',
        source: 'fallback',
      }
    }

    res.statusCode = 200
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.end(JSON.stringify(out))
  } catch (e) {
    res.statusCode = 500
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.end(JSON.stringify({ error: String(e) }))
  }
}
