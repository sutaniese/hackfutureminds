import type { IncomingMessage, ServerResponse } from 'http'

export function sendJson(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  res.end(JSON.stringify(body))
}

export function parseJson<T = unknown>(raw: string): T | null {
  if (!raw) return null
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

export function getQuery(req: IncomingMessage): URLSearchParams {
  const url = new URL(req.url ?? '/', 'http://localhost')
  return url.searchParams
}

export function pathOf(req: IncomingMessage): string {
  const url = new URL(req.url ?? '/', 'http://localhost')
  return url.pathname
}
