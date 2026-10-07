import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import express from 'express'
import { createApp } from './app.js'

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const distDir = path.join(rootDir, 'dist')
const port = Number(process.env.PORT) || 3001

const app = createApp({ dataDir: process.env.DATA_DIR ?? path.join(rootDir, 'data') })

if (existsSync(distDir)) {
  app.use(express.static(distDir))
  app.get('/{*path}', (req, res) => res.sendFile(path.join(distDir, 'index.html')))
}

app.listen(port, () => {
  console.log(`Family tree server running at http://localhost:${port}`)
})
