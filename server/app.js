import { randomUUID } from 'node:crypto'
import { mkdirSync } from 'node:fs'
import { readdir, readFile, rename, stat, unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'
import express from 'express'
import multer from 'multer'

const TREE_DOC_ID = 'family-tree'
const MAX_BACKUPS = 100
const BACKUP_WINDOW_MS = 10 * 60 * 1000
const BACKUP_NAME = /^tree-(\d{4}-\d{2}-\d{2})T(\d{2})-(\d{2})-(\d{2})-(\d{3})Z\.json$/
const MAX_PHOTO_BYTES = 10 * 1024 * 1024
const IMAGE_EXTENSIONS = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
}

function isValidTree(tree) {
  return Boolean(
    tree &&
      typeof tree.tree === 'object' &&
      tree.tree !== null &&
      Array.isArray(tree.individuals) &&
      Array.isArray(tree.parent_relationships) &&
      Array.isArray(tree.partner_relationships),
  )
}

async function writeFileAtomic(file, contents) {
  const tmp = `${file}.${randomUUID()}.tmp`
  await writeFile(tmp, contents)
  await rename(tmp, file)
}

function backupFileName(date) {
  return `tree-${date.toISOString().replace(/[:.]/g, '-')}.json`
}

function backupCreatedAt(fileName) {
  const match = BACKUP_NAME.exec(fileName)
  if (!match) return null
  const [, day, h, m, s, ms] = match
  return Date.parse(`${day}T${h}:${m}:${s}.${ms}Z`)
}

async function listBackups(dir) {
  return (await readdir(dir)).filter((f) => BACKUP_NAME.test(f)).sort()
}

/**
 * Overwrites the latest backup if it was created within the last
 * BACKUP_WINDOW_MS, otherwise starts a new one. This keeps one snapshot per
 * window rather than one per change.
 */
async function writeBackup(dir, json, now) {
  const backups = await listBackups(dir)
  const latest = backups.at(-1)
  const createdAt = latest && backupCreatedAt(latest)
  const reuseLatest = createdAt && now - createdAt < BACKUP_WINDOW_MS
  const fileName = reuseLatest ? latest : backupFileName(now)
  await writeFileAtomic(path.join(dir, fileName), json)
  if (!reuseLatest) await pruneBackups(dir, [...backups, fileName])
}

async function pruneBackups(dir, backups) {
  const excess = backups.slice(0, Math.max(0, backups.length - MAX_BACKUPS))
  await Promise.all(excess.map((f) => unlink(path.join(dir, f))))
}

/**
 * Express app standing in locally for the deployed API's `/docs` store, which
 * only holds the "family-tree" document here:
 *   GET  /api/docs/family-tree  { id, tree, updatedAt } (404 if none yet)
 *   PUT  /api/docs/family-tree  save { tree } + timestamped copy in backups/
 *   POST /api/docs              same as PUT, with { id: "family-tree", tree }
 *   POST /api/photos            multipart upload (field "photo"), returns { url }
 *   GET  /photos/*              uploaded photos
 */
export function createApp({ dataDir }) {
  const treeFile = path.join(dataDir, 'tree.json')
  const backupDir = path.join(dataDir, 'backups')
  const photoDir = path.join(dataDir, 'photos')
  mkdirSync(backupDir, { recursive: true })
  mkdirSync(photoDir, { recursive: true })

  const upload = multer({
    storage: multer.diskStorage({
      destination: photoDir,
      filename: (req, file, cb) => cb(null, randomUUID() + IMAGE_EXTENSIONS[file.mimetype]),
    }),
    limits: { fileSize: MAX_PHOTO_BYTES, files: 1 },
    fileFilter: (req, file, cb) => {
      if (IMAGE_EXTENSIONS[file.mimetype]) cb(null, true)
      else cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', 'photo'))
    },
  })

  const app = express()

  const saveTree = async (id, body, res) => {
    if (id !== TREE_DOC_ID) return res.status(404).json({ message: 'Document not found.' })
    if (!isValidTree(body?.tree)) return res.status(400).json({ message: 'Invalid tree' })
    const json = JSON.stringify(body.tree, null, 2)
    const now = new Date()
    await writeFileAtomic(treeFile, json)
    await writeBackup(backupDir, json, now)
    res.json({ id, tree: body.tree, updatedAt: now.toISOString() })
  }

  app.get('/api/docs/:id', async (req, res) => {
    if (req.params.id !== TREE_DOC_ID) {
      return res.status(404).json({ message: 'Document not found.' })
    }
    try {
      const [json, info] = await Promise.all([readFile(treeFile, 'utf8'), stat(treeFile)])
      res.json({ id: TREE_DOC_ID, tree: JSON.parse(json), updatedAt: info.mtime.toISOString() })
    } catch (err) {
      if (err.code !== 'ENOENT') throw err
      res.status(404).json({ message: 'Document not found.' })
    }
  })

  app.put('/api/docs/:id', express.json({ limit: '20mb' }), (req, res) =>
    saveTree(req.params.id, req.body, res),
  )

  app.post('/api/docs', express.json({ limit: '20mb' }), (req, res) =>
    saveTree(req.body?.id, req.body, res),
  )

  app.post('/api/photos', upload.single('photo'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No photo uploaded' })
    res.status(201).json({ url: `/photos/${req.file.filename}` })
  })

  app.use('/photos', express.static(photoDir, { maxAge: '30d', immutable: true }))

  app.use((err, req, res, next) => {
    if (res.headersSent) return next(err)
    if (err instanceof multer.MulterError) {
      const message =
        err.code === 'LIMIT_FILE_SIZE'
          ? 'Photo must be 10 MB or smaller'
          : 'Photo must be a JPEG, PNG, WebP or GIF image'
      return res.status(400).json({ error: message })
    }
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  })

  return app
}
