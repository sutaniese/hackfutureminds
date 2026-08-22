import react from '@vitejs/plugin-react'
import type { ServerResponse } from 'http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import { agentMiddleware } from './plugins/agentMiddleware'
import { careerCompareMiddleware } from './plugins/careerCompareMiddleware'
import { crmSyncMiddleware } from './plugins/crmSyncMiddleware'
import { recommendationLetterMiddleware } from './plugins/recommendationLetterMiddleware'
import { readBody } from './plugins/readBody'
import { studentsApiMiddleware } from './plugins/studentsApiMiddleware'
import { seedIfEmpty } from './plugins/vaultStore'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const sharedSrc = path.resolve(__dirname, '../../packages/shared/src')

export default defineConfig({
  resolve: {
    alias: {
      '@pathwise/shared/links': path.join(sharedSrc, 'links.ts'),
      '@pathwise/shared/brand': path.join(sharedSrc, 'brand.ts'),
      '@pathwise/shared/generate': path.join(sharedSrc, 'generate-contract.ts'),
      '@pathwise/shared/universities': path.join(sharedSrc, 'universities.ts'),
      '@pathwise/shared/grants': path.join(sharedSrc, 'grants.ts'),
      '@pathwise/shared': sharedSrc,
    },
  },
  server: {
    port: 5174,
    fs: {
      allow: [path.resolve(__dirname, '../..'), path.resolve(__dirname)],
    },
  },
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
