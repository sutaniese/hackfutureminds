import react from '@vitejs/plugin-react'
import type { ServerResponse } from 'http'
import { defineConfig } from 'vite'
import { agentMiddleware } from './plugins/agentMiddleware'
import { careerCompareMiddleware } from './plugins/careerCompareMiddleware'
import { crmSyncMiddleware } from './plugins/crmSyncMiddleware'
import { recommendationLetterMiddleware } from './plugins/recommendationLetterMiddleware'
import { readBody } from './plugins/readBody'
import { studentsApiMiddleware } from './plugins/studentsApiMiddleware'
import { seedIfEmpty } from './plugins/vaultStore'

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'ten-dev-api',
      configureServer(server) {
        try {
          seedIfEmpty()
        } catch (err) {
          console.warn('[ten] seedIfEmpty failed:', err)
        }
        server.middlewares.use(async (req, res, next) => {
          const url = req.url ?? ''
          if (url.startsWith('/api/career-compare') && req.method === 'POST') {
            await careerCompareMiddleware(req, res as ServerResponse, readBody)
            return
          }
          if (url.startsWith('/api/recommendation-letter') && req.method === 'POST') {
            await recommendationLetterMiddleware(req, res as ServerResponse, readBody)
            return
          }
          if (url.startsWith('/api/crm-sync') && (req.method === 'POST' || req.method === 'OPTIONS')) {
            await crmSyncMiddleware(req, res as ServerResponse, readBody)
            return
          }
          if (url.startsWith('/api/agent')) {
            const handled = await agentMiddleware(req, res as ServerResponse, readBody)
            if (handled) return
          }
          if (url.startsWith('/api/')) {
            const handled = await studentsApiMiddleware(req, res as ServerResponse, readBody)
            if (handled) return
          }
          next()
        })
      },
    },
  ],
})
