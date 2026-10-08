import { config } from '../config.js'

/** The whole tree is stored as one document in the API's `/docs` store. */
const TREE_DOC_ID = 'family-tree'

const docsUrl = (id) => `${config.apiBaseUrl}/docs${id ? `/${id}` : ''}`

async function errorMessage(res, fallback) {
  const body = await res.json().catch(() => null)
  return body?.message ?? body?.error ?? fallback
}

async function request(url, { token, method = 'GET', body } = {}) {
  const headers = {}
  if (token) headers.Authorization = `Bearer ${token}`
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  let res
  try {
    res = await fetch(url, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new Error('Could not reach the backup server')
  }
  if (res.status === 401 || res.status === 403) {
    throw new Error('Not authorised – try signing out and in again')
  }
  return res
}

export async function fetchBackup(token) {
  const res = await request(docsUrl(TREE_DOC_ID), { token })
  if (res.status === 404) return null
  if (!res.ok) throw new Error(await errorMessage(res, 'Could not load backup'))
  const doc = await res.json()
  return doc.tree ?? null
}

/** `PUT /docs/:id` only updates, so the first save creates the document. */
export async function saveBackup(tree, token) {
  const body = { tree }
  let res = await request(docsUrl(TREE_DOC_ID), { token, method: 'PUT', body })
  if (res.status === 404) {
    res = await request(docsUrl(), { token, method: 'POST', body: { id: TREE_DOC_ID, ...body } })
  }
  if (!res.ok) throw new Error(await errorMessage(res, 'Backup failed'))
}

export async function uploadPhoto(file) {
  const body = new FormData()
  body.append('photo', file)
  let res
  try {
    res = await fetch('/api/photos', { method: 'POST', body })
  } catch {
    throw new Error('Could not reach the server to upload the photo.')
  }
  if (!res.ok) throw new Error(await errorMessage(res, 'Photo upload failed'))
  const { url } = await res.json()
  return url
}

/** Uploads files in parallel; returns uploaded URLs and per-file errors. */
export async function uploadPhotos(files) {
  const results = await Promise.allSettled(files.map(uploadPhoto))
  return {
    urls: results.filter((r) => r.status === 'fulfilled').map((r) => r.value),
    errors: results
      .map((r, i) => (r.status === 'rejected' ? `${files[i].name}: ${r.reason.message}` : null))
      .filter(Boolean),
  }
}
