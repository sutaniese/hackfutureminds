import type { IncomingMessage, ServerResponse } from 'http'

export type CrmSyncRequest = {
  tenant_id?: string
  /** Сколько записей «отправить» в CRM (демо) */
  batch_size?: number
}

export type CrmSyncResponse = {
  ok: true
  tenant_id: string
  crm_vendor: string
  upserted_students: number
  pipelines_touched: string[]
  dry_run: boolean
  sync_id: string
  completed_at: string
}

export async function crmSyncMiddleware(
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

  if (req.method !== 'POST') {
    res.statusCode = 405
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.end(JSON.stringify({ error: 'Используйте POST с JSON { tenant_id?, batch_size? }' }))
    return
  }

  try {
    let body: CrmSyncRequest = {}
    try {
      const raw = await readBodyFn(req)
      if (raw.trim()) body = JSON.parse(raw) as CrmSyncRequest
    } catch {
      body = {}
    }

    const tenantId = typeof body.tenant_id === 'string' && body.tenant_id ? body.tenant_id : 'pathwise'
    const batch = Math.min(2000, Math.max(1, Number(body.batch_size) || 524))

    const out: CrmSyncResponse = {
      ok: true,
      tenant_id: tenantId,
      crm_vendor: 'amoCRM Enterprise (mock connector)',
      upserted_students: batch,
      pipelines_touched: ['Абитуриенты 2026', 'Гранты и стипендии', 'Родительские контакты'],
      dry_run: false,
      sync_id: `crm-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      completed_at: new Date().toISOString(),
    }

    res.statusCode = 200
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.end(JSON.stringify(out))
  } catch (e) {
    res.statusCode = 500
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.end(JSON.stringify({ ok: false, error: String(e) }))
  }
}
