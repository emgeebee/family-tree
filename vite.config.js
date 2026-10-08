import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

const REQUIRED_ENV = ['VITE_GOOGLE_CLIENT_ID', 'VITE_API_BASE_URL']

/** The app can't run without sign-in and the docs API, so fail fast. */
function assertEnv(mode) {
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  const missing = REQUIRED_ENV.filter((key) => !env[key])
  if (missing.length) {
    throw new Error(
      `Missing ${missing.join(', ')} for mode "${mode}". ` +
        'Run with --mode dev or --mode prod, or set them in .env.local.',
    )
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  assertEnv(mode)
  return {
    // Relative base works on a custom domain root and on <user>.github.io/<repo>/.
    base: './',
    plugins: [react()],
  }
})
