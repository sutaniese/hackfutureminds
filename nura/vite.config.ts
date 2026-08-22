import react from '@vitejs/plugin-react'
import type { ServerResponse } from 'http'
import { defineConfig } from 'vite'
import { careerCompareMiddleware } from './plugins/careerCompareMiddleware'
import { crmSyncMiddleware } from './plugins/crmSyncMiddleware'
import { recommendationLetterMiddleware } from './plugins/recommendationLetterMiddleware'
import { readBody } from './plugins/readBody'

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'pathwise-dev-api',
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          if (req.url?.startsWith('/api/career-compare') && req.method === 'POST') {
            await careerCompareMiddleware(req, res as ServerResponse, readBody)
            return
          }
          if (req.url?.startsWith('/api/recommendation-letter') && req.method === 'POST') {
            await recommendationLetterMiddleware(req, res as ServerResponse, readBody)
            return
          }
          if (req.url?.startsWith('/api/crm-sync') && (req.method === 'POST' || req.method === 'OPTIONS')) {
            await crmSyncMiddleware(req, res as ServerResponse, readBody)
            return
          }
          next()
        })
      },
    },
  ],
})
