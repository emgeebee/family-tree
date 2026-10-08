import { config } from '../config.js'
import { isValidTree } from '../utils/familyModel.js'
import { treeName } from '../utils/trees.js'

/** Marks family trees among the user's documents, which other apps share. */
const TREE_DOC_TYPE = 'family-tree'

async function errorMessage(res, fallback) {
  const body = await res.json().catch(() => null)
  return body?.message ?? body?.error ?? fallback
}

async function request(path, { token, method = 'GET', body } = {}) {
  const headers = { Authorization: `Bearer ${token}` }
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  let res
  try {
    res = await fetch(`${config.apiBaseUrl}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new Error('Could not reach the server')
  }
  if (res.status === 401 || res.status === 403) {
    throw new Error('Not authorised – try signing out and in again')
  }
  return res
}

async function json(res, fallback) {
  if (!res.ok) throw new Error(await errorMessage(res, fallback))
  return res.json()
}

const docPath = (id) => `/docs/${encodeURIComponent(id)}`

function toTreeRecord(doc) {
  return { id: doc.id, name: treeName(doc.tree), updatedAt: doc.updatedAt, tree: doc.tree }
}

/** All of the user's trees, including the full tree data. */
export async function listTrees(token) {
  const { docs } = await json(await request('/docs', { token }), 'Could not load your trees')
  return docs.filter((doc) => isValidTree(doc.tree)).map(toTreeRecord)
}

/** `PUT /docs/:id` only updates, so the first save creates the document. */
export async function saveTree(token, id, tree) {
  const body = { type: TREE_DOC_TYPE, name: treeName(tree), tree }
  let res = await request(docPath(id), { token, method: 'PUT', body })
  if (res.status === 404) res = await request('/docs', { token, method: 'POST', body: { id, ...body } })
  return json(res, 'Could not save the tree')
}

export async function deleteTree(token, id) {
  const res = await request(docPath(id), { token, method: 'DELETE' })
  if (res.status !== 404) await json(res, 'Could not delete the tree')
}

/** A tree that hasn't reached the server yet has no share links. */
export async function listShares(token, id) {
  const res = await request(`${docPath(id)}/shares`, { token })
  if (res.status === 404) return []
  return json(res, 'Could not load share links')
}

export async function createShare(token, id) {
  const res = await request(`${docPath(id)}/shares`, { token, method: 'POST' })
  return json(res, 'Could not create a share link')
}

export async function revokeShare(token, id, code) {
  const path = `${docPath(id)}/shares/${encodeURIComponent(code)}`
  await json(await request(path, { token, method: 'DELETE' }), 'Could not revoke the share link')
}

export async function fetchSharedTree(token, code) {
  const res = await request(`/shared/${encodeURIComponent(code)}`, { token })
  if (res.status === 404) throw new Error('This share link has expired or been revoked.')
  const { doc } = await json(res, 'Could not open the shared tree')
  if (!isValidTree(doc?.tree)) throw new Error('This share link is not a family tree.')
  return toTreeRecord(doc)
}

export async function uploadPhoto(file) {
  const body = new FormData()
  body.append('photo', file)
  let res
  try {
    res = await fetch(`${config.apiBaseUrl}/photos`, { method: 'POST', body })
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
