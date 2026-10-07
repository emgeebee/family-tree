import path from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { createApp } from './server/app.js'

/** Mounts the Express API inside the Vite dev/preview server. */
function apiServer() {
  const mount = (server) => {
    const app = createApp({ dataDir: process.env.DATA_DIR ?? path.resolve('data') })
    server.middlewares.use((req, res, next) => {
      if (req.url.startsWith('/api/') || req.url.startsWith('/photos/')) app(req, res, next)
      else next()
    })
  }
  return { name: 'api-server', configureServer: mount, configurePreviewServer: mount }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), apiServer()],
  server: {
    watch: { ignored: ['**/data/**'] },
  },
})
