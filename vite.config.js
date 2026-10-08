import path from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import { createApp } from './server/app.js'

const DEPLOY_MODES = ['dev', 'prod']
const REQUIRED_DEPLOY_ENV = ['VITE_GOOGLE_CLIENT_ID', 'VITE_API_BASE_URL']

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

/** Deploy builds must not ship without sign-in or a backup API. */
function assertDeployEnv(mode) {
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  const missing = REQUIRED_DEPLOY_ENV.filter((key) => !env[key])
  if (missing.length) {
    throw new Error(`Missing ${missing.join(', ')} for the "${mode}" build; set them in .env.${mode}`)
  }
}

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  if (command === 'build' && DEPLOY_MODES.includes(mode)) assertDeployEnv(mode)
  return {
    plugins: [react(), apiServer()],
    server: {
      watch: { ignored: ['**/data/**'] },
    },
  }
})
