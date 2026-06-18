import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

// Load definitions file once at module level (not on every request)
const definitionsPath = join(process.cwd(), 'api', 'data', 'definitions.json')
let definitionsData = null
if (existsSync(definitionsPath)) {
  try {
    definitionsData = JSON.parse(readFileSync(definitionsPath, 'utf-8'))
  } catch {
    // will be caught per-request when definitionsData is null
  }
}

// Development API mock plugin
function devApiMock() {
  return {
    name: 'dev-api-mock',
    configureServer(server) {
      server.middlewares.use('/api/definition', (req, res) => {
        const url = new URL(req.url, 'http://localhost')
        const wordId = url.searchParams.get('wordId')

        if (!wordId) {
          res.statusCode = 400
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: 'Missing wordId parameter', definitions: [] }))
          return
        }

        if (!definitionsData) {
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: 'Definitions file not found. Run npm run build:vocabulary first.', definitions: [] }))
          return
        }

        try {
          const wordData = definitionsData[wordId]

          if (!wordData) {
            res.statusCode = 404
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: 'Word not found', definitions: [] }))
            return
          }

          res.statusCode = 200
          res.setHeader('Content-Type', 'application/json')
          res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=604800')
          res.end(JSON.stringify({
            definitions: wordData.definitions,
            rae_link: wordData.rae_link
          }))
        } catch (error) {
          console.error('Error in dev API mock:', error)
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: 'Internal server error', definitions: [] }))
        }
      })
    }
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), devApiMock()],
  // Vercel serves from root, no base path needed
  test: {
    environment: 'node',
    include: ['src/**/*.test.js', 'scripts/**/*.test.js'],
  },
})
